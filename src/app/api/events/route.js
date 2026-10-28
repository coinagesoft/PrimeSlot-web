// src/app/api/events/route.js

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import pool from '../../../lib/db';

export const dynamic = 'force-dynamic';

// Validate event data
const createEventSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),

  date: z.string().min(1, 'Date is required'),

  location: z.string().trim().min(1, 'Location is required'),

  description: z.string().optional().default(''),

  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

// Validate YYYY-MM-DD dates
function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

// Normalize MySQL records for the frontend
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
    title: row.title ?? recordData.title ?? '',
    description: row.description ?? recordData.description ?? '',
    date: row.date
      ? String(row.date).slice(0, 10)
      : recordData.date ?? '',
    location: row.location ?? recordData.location ?? '',
    status: String(
      row.status ?? recordData.status ?? 'draft'
    ).toLowerCase(),
    createdAt: row.createdAt ?? recordData.createdAt ?? null,
    updatedAt: row.updatedAt ?? recordData.updatedAt ?? null,
  };
}

/* =========================================
   GET /api/events

   Query parameters:
   page, pageSize, day, from, to, q, status
========================================= */

export async function GET(req) {
  try {
    const url = new URL(req.url);

    const pageValue = Number.parseInt(
      url.searchParams.get('page') || '1',
      10
    );

    const pageSizeValue = Number.parseInt(
      url.searchParams.get('pageSize') || '12',
      10
    );

    const page = Number.isFinite(pageValue)
      ? Math.max(1, pageValue)
      : 1;

    const pageSize = Number.isFinite(pageSizeValue)
      ? Math.min(50, Math.max(1, pageSizeValue))
      : 12;

    const offset = (page - 1) * pageSize;

    const day = url.searchParams.get('day');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const status = (
      url.searchParams.get('status') || ''
    ).trim().toLowerCase();

    const q = (
      url.searchParams.get('q') || ''
    ).trim();

    const conditions = [];
    const params = [];

    // Filter by status
    if (status && status !== 'all') {
      if (!['draft', 'published', 'archived'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid event status' },
          { status: 400 }
        );
      }

      conditions.push('LOWER(status) = ?');
      params.push(status);
    }

    // Filter by exact day: YYYYMMDD
    if (day) {
      if (!/^\d{8}$/.test(day)) {
        return NextResponse.json(
          { error: 'Invalid day format. Use YYYYMMDD.' },
          { status: 400 }
        );
      }

      const dayDate =
        `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;

      if (!isValidDate(dayDate)) {
        return NextResponse.json(
          { error: 'Invalid calendar date' },
          { status: 400 }
        );
      }

      conditions.push('DATE(date) = ?');
      params.push(dayDate);
    }

    // Filter by starting date
    if (from) {
      if (!isValidDate(from)) {
        return NextResponse.json(
          { error: 'Invalid from date. Use YYYY-MM-DD.' },
          { status: 400 }
        );
      }

      conditions.push('DATE(date) >= ?');
      params.push(from);
    }

    // Filter by ending date
    if (to) {
      if (!isValidDate(to)) {
        return NextResponse.json(
          { error: 'Invalid to date. Use YYYY-MM-DD.' },
          { status: 400 }
        );
      }

      conditions.push('DATE(date) <= ?');
      params.push(to);
    }

    // Search title and location
    if (q) {
      conditions.push(
        '(LOWER(title) LIKE LOWER(?) OR LOWER(location) LIKE LOWER(?))'
      );

      params.push(`%${q}%`, `%${q}%`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Count matching records before pagination
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM events
       ${whereClause}`,
      params
    );

    const total = Number(countRows[0].total);

    // Fetch the requested page
    const [rows] = await pool.execute(
      `SELECT *
       FROM events
       ${whereClause}
       ORDER BY DATE(date) DESC, createdAt DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const records = rows.map(normalizeEvent);

    return NextResponse.json({
      success: true,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      records,
    });
  } catch (error) {
    console.error('GET /api/events error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

/* =========================================
   POST /api/events
   Create an event in MySQL
========================================= */

export async function POST(req) {
  try {
    const body = await req.json();

    // Validate input
    const parsed = createEventSchema.parse(body);

    if (!isValidDate(parsed.date)) {
      return NextResponse.json(
        { error: 'Invalid date. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    // Generate an event ID
    const id = `evt-${randomUUID()}`;
    const now = new Date().toISOString();

    // Event data returned to the frontend
    const event = {
      title: parsed.title,
      description: parsed.description,
      date: parsed.date,
      location: parsed.location,
      status: parsed.status,
      createdAt: now,
      updatedAt: now,
    };

    // Store the complete event as JSON
    const recordData = JSON.stringify({
      id,
      ...event,
    });

    // Every column with a JSON_VALID constraint must receive valid JSON.
    await pool.execute(
      `INSERT INTO events (
        firebase_key,
        record_data,
        title,
        description,
        date,
        location,
        status,
        createdAt,
        updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        recordData,
        JSON.stringify(parsed.title),
        JSON.stringify(parsed.description),
        JSON.stringify(parsed.date),
        JSON.stringify(parsed.location),
        JSON.stringify(parsed.status),
        JSON.stringify(now),
        JSON.stringify(now),
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Event created successfully',
        data: {
          id,
          ...event,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error('POST /api/events error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create event',
        details: error.message,
      },
      { status: 500 }
    );
  }
}