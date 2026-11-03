// src/app/api/members/[id]/meetings/[meetingid]/respond/route.js

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import db from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET;

const BodySchema = z.object({
  action: z.enum(['accept', 'decline']),
  message: z.string().optional().default(''),
});

function addCORS(res) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST,PATCH,OPTIONS');
  res.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  return res;
}

export async function OPTIONS() {
  return addCORS(
    new NextResponse(null, { status: 204 })
  );
}

// Authenticate mobile member using Bearer JWT
function requireUser(req) {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw Object.assign(
      new Error('JWT_SECRET is not configured correctly'),
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization') || '';

  if (!authHeader.startsWith('Bearer ')) {
    throw Object.assign(
      new Error('Authorization token is required'),
      { status: 401 }
    );
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    throw Object.assign(
      new Error('Invalid authorization token'),
      { status: 401 }
    );
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'prime-slot',
      audience: 'prime-slot-client',
    });

    if (
      !payload.sub ||
      payload.provider !== 'check-user' ||
      payload.purpose !== 'test-preview'
    ) {
      throw new Error('Invalid token claims');
    }

    return {
      memberId: String(payload.sub),
    };
  } catch (error) {
    throw Object.assign(
      new Error('Invalid or expired token'),
      { status: 401 }
    );
  }
}

async function handleRespond(req, paramsPromise) {
  try {
    const params = await paramsPromise;

    const memberId = params?.id;
    const meetingId = params?.meetingid;

    if (!memberId || !meetingId) {
      return addCORS(
        NextResponse.json(
          { success: false, error: 'Missing member ID or meeting ID' },
          { status: 400 }
        )
      );
    }

    // 1. Authenticate member
    const user = requireUser(req);

    // 2. Member ID in URL must match authenticated JWT
    if (user.memberId !== memberId) {
      return addCORS(
        NextResponse.json(
          {
            success: false,
            error: 'You are not authorized to respond for this member',
          },
          { status: 403 }
        )
      );
    }

    // 3. Read request body
    let body;

    try {
      body = await req.json();
    } catch {
      return addCORS(
        NextResponse.json(
          { success: false, error: 'Invalid JSON body' },
          { status: 400 }
        )
      );
    }

    const validation = BodySchema.safeParse(body);

    if (!validation.success) {
      return addCORS(
        NextResponse.json(
          {
            success: false,
            error: 'Invalid request body',
            details: validation.error.flatten(),
          },
          { status: 400 }
        )
      );
    }

    const { action, message } = validation.data;

    // 4. Find meeting and verify member participation
    const [meetings] = await db.execute(
      `
      SELECT
        id,
        event_id,
        a_id,
        b_id,
        status,
        created_by
      FROM meetings
      WHERE id = ?
        AND (a_id = ? OR b_id = ?)
      LIMIT 1
      `,
      [meetingId, user.memberId, user.memberId]
    );

    if (!meetings.length) {
      return addCORS(
        NextResponse.json(
          {
            success: false,
            error: 'Meeting not found for this member',
          },
          { status: 404 }
        )
      );
    }

    const meeting = meetings[0];

    // 5. Check meeting status
    if (
      meeting.status === 'approved' ||
      meeting.status === 'canceled'
    ) {
      return addCORS(
        NextResponse.json(
          {
            success: false,
            error: `Meeting is already ${meeting.status}`,
          },
          { status: 409 }
        )
      );
    }

    // 6. Determine new status
    const newStatus =
      action === 'accept' ? 'approved' : 'canceled';

    // 7. Update meeting in MySQL
    const [updateResult] = await db.execute(
      `
      UPDATE meetings
      SET
        status = ?,
        responded_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
        AND status = 'pending'
        AND (a_id = ? OR b_id = ?)
      `,
      [
        newStatus,
        meetingId,
        user.memberId,
        user.memberId,
      ]
    );

    if (updateResult.affectedRows === 0) {
      return addCORS(
        NextResponse.json(
          {
            success: false,
            error: 'Meeting could not be updated. Please check its current status.',
          },
          { status: 409 }
        )
      );
    }

    // 8. Find notification recipient
    const notificationMemberId =
      meeting.created_by || meeting.a_id;

    const notificationType =
      action === 'accept'
        ? 'meeting_accepted'
        : 'meeting_declined';

    const notificationTitle =
      action === 'accept'
        ? 'Meeting Accepted'
        : 'Meeting Declined';

    const notificationBody = message
      ? message
      : action === 'accept'
        ? 'Your meeting request has been accepted.'
        : 'Your meeting request has been declined.';

    // 9. Insert notification in MySQL
    await db.execute(
      `
      INSERT INTO notifications (
        member_id,
        type,
        title,
        body,
        meeting_id,
        event_id,
        from_member_id,
        is_read,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())
      `,
      [
        notificationMemberId,
        notificationType,
        notificationTitle,
        notificationBody,
        meetingId,
        meeting.event_id || null,
        user.memberId,
      ]
    );

    // 10. Return response
    return addCORS(
      NextResponse.json({
        success: true,
        message:
          action === 'accept'
            ? 'Meeting accepted successfully'
            : 'Meeting declined successfully',
        meeting: {
          id: meetingId,
          status: newStatus,
          respondedBy: user.memberId,
        },
      })
    );
  } catch (error) {
    console.error('Meeting Respond API Error:', error);

    return addCORS(
      NextResponse.json(
        {
          success: false,
          error: error.message || 'Internal server error',
        },
        { status: error.status || 500 }
      )
    );
  }
}

export async function POST(req, { params }) {
  return handleRespond(req, params);
}

export async function PATCH(req, { params }) {
  return handleRespond(req, params);
}