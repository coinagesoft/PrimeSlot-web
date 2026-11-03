// src/app/api/members/availability/route.js

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET;

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

export async function OPTIONS() {
  return addCORS(
    new NextResponse(null, { status: 204 })
  );
}

/* ---------------- AUTHENTICATION ---------------- */

function requireUser(req) {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw Object.assign(
      new Error('JWT_SECRET is missing or invalid'),
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization') || '';

  if (!authHeader.startsWith('Bearer ')) {
    throw Object.assign(
      new Error('Authorization token required'),
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
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (
      !payload.sub ||
      payload.provider !== 'check-user' ||
      payload.purpose !== 'test-preview'
    ) {
      throw new Error('Invalid token claims');
    }

    return {
      mode: 'member',
      uid: String(payload.sub),
    };
  } catch (error) {
    throw Object.assign(
      new Error('Invalid or expired token'),
      { status: 401 }
    );
  }
}

/* ---------------- DATE HELPER ---------------- */

function toISOString(value) {
  if (!value) return null;

  const date = value instanceof Date
    ? value
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

/* ---------------- POST API ---------------- */

export async function POST(req) {
  try {
    // 1. Authenticate member
    const user = requireUser(req);

    // 2. Read request body
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

    const { aId, bId, eventId } = body;

    if (!aId || !bId) {
      return addCORS(
        NextResponse.json(
          {
            success: false,
            error: 'aId and bId are required',
          },
          { status: 400 }
        )
      );
    }

    // 3. Ensure the authenticated member is one of the participants
    if (
      String(user.uid) !== String(aId) &&
      String(user.uid) !== String(bId)
    ) {
      return addCORS(
        NextResponse.json(
          {
            success: false,
            error: 'You are not allowed to check availability for these members',
          },
          { status: 403 }
        )
      );
    }

    // 4. Fetch meetings from MySQL
    let sql = `
      SELECT
        mt.id,
        mt.event_id,
        mt.a_id,
        mt.b_id,
        mt.scheduled_at,
        mt.duration_min,
        mt.end_time,
        mt.status,
        ma.full_name AS a_name,
        mb.full_name AS b_name

      FROM meetings mt

      LEFT JOIN members ma
        ON ma.id = mt.a_id

      LEFT JOIN members mb
        ON mb.id = mt.b_id

      WHERE (
        mt.a_id IN (?, ?)
        OR mt.b_id IN (?, ?)
      )
    `;

    const values = [
      aId,
      bId,
      aId,
      bId,
    ];

    // 5. Apply event filter if eventId is provided
    if (eventId) {
      sql += ` AND mt.event_id = ?`;
      values.push(eventId);
    }

    sql += `
      ORDER BY mt.scheduled_at ASC
    `;

    const [meetings] = await db.execute(sql, values);

    // 6. Format meetings for calendar
    const events = meetings.map((meeting) => {
      const start = toISOString(meeting.scheduled_at);

      let end = toISOString(meeting.end_time);

      // Calculate end time if end_time is unavailable
      if (!end && start) {
        const duration = Number(meeting.duration_min) || 30;

        end = new Date(
          new Date(start).getTime() + duration * 60 * 1000
        ).toISOString();
      }

      // Find the other participant relative to the supplied pair
      let otherName = 'Unknown';

      if (String(meeting.a_id) === String(aId)) {
        otherName = meeting.b_name || 'Unknown';
      } else if (String(meeting.b_id) === String(aId)) {
        otherName = meeting.a_name || 'Unknown';
      } else if (String(meeting.a_id) === String(bId)) {
        otherName = meeting.b_name || 'Unknown';
      } else if (String(meeting.b_id) === String(bId)) {
        otherName = meeting.a_name || 'Unknown';
      }

      return {
        id: meeting.id,
        title: `Meeting with ${otherName}`,
        start,
        end,

        extendedProps: {
          meetingId: meeting.id,
          eventId: meeting.event_id || null,
          aId: meeting.a_id,
          bId: meeting.b_id,
          status: meeting.status || 'pending',
        },
      };
    });

    // 7. Return response
    return addCORS(
      NextResponse.json({
        success: true,
        events,
        total: events.length,
      })
    );

  } catch (error) {
    console.error('Availability API error:', error);

    return addCORS(
      NextResponse.json(
        {
          success: false,
          error: error.message || 'Server error',
        },
        {
          status: error.status || 500,
        }
      )
    );
  }
}