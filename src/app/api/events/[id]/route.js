export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

function normalizeEvent(row) {
  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    date:
      row.event_date instanceof Date
        ? row.event_date.toISOString().slice(0, 10)
        : String(row.event_date ?? '').slice(0, 10),
    location: row.location ?? '',
    status: String(row.status ?? 'draft').toLowerCase(),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
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

function isValidStatus(status) {
  return ['draft', 'published', 'archived'].includes(status);
}

async function findEvent(id) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       title,
       description,
       event_date,
       location,
       status,
       created_by,
       created_at,
       updated_at
     FROM events
     WHERE id = ?
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

    let body;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const title =
      typeof body.title === 'string' ? body.title.trim() : '';

    const description =
      typeof body.description === 'string'
        ? body.description
        : '';

    const date = body.date;

    const location =
      typeof body.location === 'string'
        ? body.location.trim()
        : '';

    const status = String(body.status ?? 'draft').toLowerCase();

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

    if (!isValidStatus(status)) {
      return jsonResponse(
        { error: 'Invalid event status' },
        { status: 400 }
      );
    }

    const existingRow = await findEvent(id);

    if (!existingRow) {
      return jsonResponse(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    await pool.execute(
      `UPDATE events
       SET title = ?,
           description = ?,
           event_date = ?,
           location = ?,
           status = ?
       WHERE id = ?`,
      [
        title,
        description,
        date,
        location,
        status,
        id,
      ]
    );

    // Fetch the updated row so MySQL supplies the actual
    // updated_at timestamp.
    const updatedRow = await findEvent(id);

    if (!updatedRow) {
      return jsonResponse(
        { error: 'Event not found after update' },
        { status: 404 }
      );
    }

    return jsonResponse({
      success: true,
      message: 'Event updated successfully',
      data: normalizeEvent(updatedRow),
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
      `DELETE FROM events WHERE id = ?`,
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