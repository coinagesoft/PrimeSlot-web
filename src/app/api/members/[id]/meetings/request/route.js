// src/app/api/members/[id]/meetings/request/route.js

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import db from '@/lib/db';

const JWT_ISSUER = 'prime-slot';
const JWT_AUDIENCE = 'prime-slot-client';

function addCORS(res) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  return res;
}

function errorResponse(message, status = 500) {
  return addCORS(
    NextResponse.json({ success: false, error: message }, { status })
  );
}

export async function OPTIONS() {
  return addCORS(new NextResponse(null, { status: 204 }));
}

// Mobile authentication: Bearer JWT only.
function authenticateUser(req) {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw Object.assign(
      new Error('JWT_SECRET is missing or invalid'),
      { status: 500 }
    );
  }

  const authorization = req.headers.get('authorization') || '';

  if (!authorization.startsWith('Bearer ')) {
    throw Object.assign(
      new Error('Authorization token is required'),
      { status: 401 }
    );
  }

  const token = authorization.substring(7).trim();

  if (!token) {
    throw Object.assign(
      new Error('Invalid authorization token'),
      { status: 401 }
    );
  }

  let payload;

  try {
    payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    throw Object.assign(
      new Error('Invalid or expired token'),
      { status: 401 }
    );
  }

  if (
    !payload ||
    typeof payload === 'string' ||
    !payload.sub ||
    payload.provider !== 'check-user' ||
    payload.purpose !== 'test-preview'
  ) {
    throw Object.assign(
      new Error('Invalid member authentication'),
      { status: 401 }
    );
  }

  return String(payload.sub);
}

// Request body validation.
const Schema = z.object({
  eventId: z.string().trim().min(1).optional().nullable(),

  scheduledAt: z.preprocess(
    (value) => {
      if (typeof value === 'string') {
        return Date.parse(value);
      }

      return Number(value);
    },
    z.number().int().positive()
  ),

  durationMin: z.number().int().positive().max(1440).default(30),

  place: z.string().max(500).optional().default(''),

  topic: z.string().max(255).optional().default(''),
});

function createId() {
  return randomUUID().replace(/-/g, '');
}

export async function POST(req, context) {
  let connection;

  try {
    // 1. Authenticate the logged-in member.
    const requesterId = authenticateUser(req);

    // 2. Get recipient ID from URL.
    const params = await context.params;
    const recipientId = String(params?.id || '').trim();

    if (!recipientId || recipientId.toLowerCase() === 'undefined') {
      return errorResponse('Invalid recipient member ID', 400);
    }

    if (requesterId === recipientId) {
      return errorResponse(
        'You cannot request a meeting with yourself',
        400
      );
    }

    // 3. Validate request body.
    const body = await req.json();
    const parsed = Schema.parse(body);

    // Ignore placeholder event IDs.
    let eventId = parsed.eventId?.trim() || null;

    if (
      eventId &&
      ['undefined', 'null'].includes(eventId.toLowerCase())
    ) {
      eventId = null;
    }

    // 4. Convert timestamp to MySQL-compatible Date values.
    const scheduledAt = new Date(parsed.scheduledAt);

    if (Number.isNaN(scheduledAt.getTime())) {
      return errorResponse('Invalid meeting date or time', 400);
    }

    const endTime = new Date(
      scheduledAt.getTime() + parsed.durationMin * 60 * 1000
    );

    const meetingId = createId();
    const notificationId = createId();

    connection = await db.getConnection();

    await connection.beginTransaction();

    // 5. Verify requester and recipient exist and are active.
    const [members] = await connection.execute(
      `SELECT id, full_name
       FROM members
       WHERE id IN (?, ?)
         AND is_active = 1`,
      [requesterId, recipientId]
    );

    const requesterExists = members.some(
      (member) => String(member.id) === requesterId
    );

    const recipientExists = members.some(
      (member) => String(member.id) === recipientId
    );

    if (!requesterExists) {
      throw Object.assign(
        new Error('Your member account was not found or is inactive'),
        { status: 404 }
      );
    }

    if (!recipientExists) {
      throw Object.assign(
        new Error('Recipient member was not found or is inactive'),
        { status: 404 }
      );
    }

    // 6. If eventId is supplied, verify that the event exists.
    if (eventId) {
      const [events] = await connection.execute(
        `SELECT id
         FROM events
         WHERE id = ?`,
        [eventId]
      );

      if (events.length === 0) {
        throw Object.assign(
          new Error('The selected event does not exist'),
          { status: 400 }
        );
      }
    }

    // 7. Create meeting.
    await connection.execute(
      `INSERT INTO meetings (
          id,
          event_id,
          a_id,
          b_id,
          scheduled_at,
          duration_min,
          end_time,
          mode,
          place,
          topic,
          notes,
          status,
          created_by,
          created_at,
          updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        meetingId,
        eventId,
        requesterId,
        recipientId,
        scheduledAt,
        parsed.durationMin,
        endTime,
        'inperson',
        parsed.place,
        parsed.topic,
        '',
        'pending',
        requesterId,
      ]
    );

    // 8. Add both members to each other's contacts.
    // Existing contacts are preserved.
    await connection.execute(
      `INSERT INTO contacts (
          member_id,
          contact_id,
          meeting_id
       )
       VALUES
          (?, ?, ?),
          (?, ?, ?)
       ON DUPLICATE KEY UPDATE
          meeting_id = COALESCE(contacts.meeting_id, VALUES(meeting_id))`,
      [
        requesterId,
        recipientId,
        meetingId,

        recipientId,
        requesterId,
        meetingId,
      ]
    );

    // 9. Create notification for recipient.
    await connection.execute(
      `INSERT INTO notifications (
          id,
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [
        notificationId,
        recipientId,
        'meeting_request',
        'New Meeting Request',
        'You have received a new meeting request.',
        meetingId,
        eventId,
        requesterId,
      ]
    );

    // 10. Commit all changes.
    await connection.commit();

    return addCORS(
      NextResponse.json(
        {
          success: true,
          ok: true,
          id: meetingId,
          meetingId,
          eventId,
          message: 'Meeting request sent successfully',
        },
        { status: 201 }
      )
    );

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Meeting transaction rollback failed:', rollbackError);
      }
    }

    if (error instanceof z.ZodError) {
      return errorResponse(
        error.issues.map((issue) => issue.message).join(', '),
        400
      );
    }

    console.error('Meeting request API error:', error);

    return errorResponse(
      error.message || 'Server error',
      error.status || 500
    );

  } finally {
    if (connection) {
      connection.release();
    }
  }
}