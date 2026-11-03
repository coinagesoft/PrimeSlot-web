// src/app/api/meetings/pending/route.js

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';

const JWT_ISSUER = 'prime-slot';
const JWT_AUDIENCE = 'prime-slot-client';

function addCORS(res) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  return res;
}

function errorResponse(message, status = 500) {
  return addCORS(
    NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    )
  );
}

export async function OPTIONS() {
  return addCORS(new NextResponse(null, { status: 204 }));
}

// Authenticate Flutter mobile user using Bearer JWT.
function requireUser(req) {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET || JWT_SECRET.length < 32) {
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
    payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch (error) {
    throw Object.assign(
      new Error('Invalid or expired token'),
      { status: 401 }
    );
  }

  if (
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

export async function GET(req) {
  try {
    // 1. Authenticate logged-in member.
    const memberId = requireUser(req);

    // 2. Verify member exists and is active.
    const [members] = await db.execute(
      `SELECT id
       FROM members
       WHERE id = ?
         AND is_active = 1
       LIMIT 1`,
      [memberId]
    );

    if (members.length === 0) {
      return errorResponse('Member not found or inactive', 404);
    }

    // 3. Fetch all pending meetings involving this member.
    const [meetings] = await db.execute(
      `SELECT
          m.id AS meetingId,
          m.event_id AS eventId,
          m.a_id AS aId,
          m.b_id AS bId,
          m.scheduled_at AS scheduledAt,
          m.duration_min AS durationMin,
          m.end_time AS endTime,
          m.mode,
          m.place,
          m.topic,
          m.notes,
          m.status,
          m.created_by AS createdBy,
          m.responded_at AS respondedAt,
          m.created_at AS createdAt,
          m.updated_at AS updatedAt,

          a.full_name AS aName,
          a.phone AS aPhone,
          a.email AS aEmail,
          a.profile_image_url AS aProfileImageUrl,

          b.full_name AS bName,
          b.phone AS bPhone,
          b.email AS bEmail,
          b.profile_image_url AS bProfileImageUrl

       FROM meetings m

       INNER JOIN members a
          ON a.id = m.a_id

       INNER JOIN members b
          ON b.id = m.b_id

       WHERE
          (m.a_id = ? OR m.b_id = ?)
          AND m.status = 'pending'

       ORDER BY m.created_at DESC`,
      [memberId, memberId]
    );

    // 4. Return pending meetings.
    return addCORS(
      NextResponse.json(
        {
          success: true,
          meetings,
          total: meetings.length,
        },
        { status: 200 }
      )
    );

  } catch (error) {
    console.error('Pending meetings API error:', error);

    return errorResponse(
      error.message || 'Server error',
      error.status || 500
    );
  }
}