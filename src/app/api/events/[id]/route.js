export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { randomUUID } from 'crypto';

// Decode JSON-formatted values stored in the event columns.
function decodeJsonValue(value, fallback = '') {
  if (value == null) return fallback;

  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// Normalize a database row for the frontend.
function normalizeEvent(row) {
  let recordData = {};

  if (row.record_data) {
    try {
      recordData =
        typeof row.record_data === 'string'
          ? JSON.parse(row.record_data)
          : row.record_data;
    } catch {
      recordData = {};
    }
  }

  return {
    ...recordData,
    id: row.firebase_key,
    title: decodeJsonValue(row.title, recordData.title ?? ''),
    description: decodeJsonValue(
      row.description,
      recordData.description ?? ''
    ),
    date: decodeJsonValue(row.date, recordData.date ?? ''),
    location: decodeJsonValue(row.location, recordData.location ?? ''),
    status: String(
      decodeJsonValue(row.status, recordData.status ?? 'draft')
    ).toLowerCase(),
    createdAt: decodeJsonValue(
      row.createdAt,
      recordData.createdAt ?? null
    ),
    updatedAt: decodeJsonValue(
      row.updatedAt,
      recordData.updatedAt ?? null
    ),
  };
}

function addCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET,PUT,DELETE,OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  return response;
}

function jsonResponse(data, options = {}) {
  return addCORS(NextResponse.json(data, options));
}

async function getEventId(context) {
  const params = await context.params;
  return params?.id;
}

function isValidDate(value) {
  if (typeof value !== 'string') return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

async function findEvent(id) {
  const [rows] = await pool.execute(
    `SELECT *
     FROM events
     WHERE firebase_key = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] ?? null;
}

export async function OPTIONS() {
  return addCORS(new NextResponse(null, { status: 204 }));
}

/* =========================================
   GET /api/events/[id]
   Fetch one event
========================================= */

export async function GET(request, context) {
  try {
   const id = await getEventId(context);

    if (!id) {
      return jsonResponse(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const row = await findEvent(id);

    if (!row) {
      return jsonResponse(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return jsonResponse({
      success: true,
      data: normalizeEvent(row),
    });
  } catch (error) {
    console.error('GET /api/events/[id] error:', error);

    return jsonResponse(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

/* =========================================
   PUT /api/events/[id]
   Update an event
========================================= */


export async function PUT(request, context) {
  try {
    const id = await getEventId(context);

    if (!id) {
      return jsonResponse(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const title =
      typeof body.title === 'string' ? body.title.trim() : '';

    const description =
      typeof body.description === 'string' ? body.description : '';

    const date = body.date;

    const location =
      typeof body.location === 'string' ? body.location.trim() : '';

    const status = body.status ?? 'draft';

    if (!title || !location || !date) {
      return jsonResponse(
        {
          error: 'Title, date, and location are required',
        },
        { status: 400 }
      );
    }

    if (!isValidDate(date)) {
      return jsonResponse(
        { error: 'Invalid date. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    if (!['draft', 'published', 'archived'].includes(status)) {
      return jsonResponse(
        { error: 'Invalid event status' },
        { status: 400 }
      );
    }

    // Preserve the original creation timestamp.
    const existingRow = await findEvent(id);

    if (!existingRow) {
      return jsonResponse(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const existingEvent = normalizeEvent(existingRow);
    const now = new Date().toISOString();

    const event = {
      ...existingEvent,
      title,
      description,
      date,
      location,
      status,
      updatedAt: now,
    };

    // Store the full event as JSON.
    const recordData = JSON.stringify(event);

    // JSON.stringify is required because the current table
    // has JSON_VALID constraints on these individual columns.
    await pool.execute(
      `UPDATE events
       SET record_data = ?,
           title = ?,
           description = ?,
           date = ?,
           location = ?,
           status = ?,
           updatedAt = ?
       WHERE firebase_key = ?`,
      [
        recordData,
        JSON.stringify(title),
        JSON.stringify(description),
        JSON.stringify(date),
        JSON.stringify(location),
        JSON.stringify(status),
        JSON.stringify(now),
        id,
      ]
    );

    return jsonResponse({
      success: true,
      message: 'Event updated successfully',
      data: event,
    });
  } catch (error) {
    console.error('PUT /api/events/[id] error:', error);

    return jsonResponse(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

/* =========================================
   DELETE /api/events/[id]
   Delete an event
========================================= */

export async function DELETE(request, context) {
  try {
    const id = await getEventId(context);

    if (!id) {
      return jsonResponse(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `DELETE FROM events
       WHERE firebase_key = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return jsonResponse(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return jsonResponse({
      success: true,
      message: 'Event deleted successfully',
      id,
    });
  } catch (error) {
    console.error('DELETE /api/events/[id] error:', error);

    return jsonResponse(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}