// src/app/api/events/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import pool from "../../../lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =========================================
// Validation
// =========================================

const createEventSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),

  date: z.string().min(1, "Date is required"),

  location: z.string().trim().min(1, "Location is required"),

  description: z.string().optional().default(""),

  status: z
    .enum(["draft", "published", "archived"])
    .default("draft"),
});

// =========================================
// Date helpers
// =========================================

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

function normalizeDate(value) {
  if (!value) return "";

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function normalizeTimestamp(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
}

// =========================================
// Normalize MySQL event records
// =========================================

function normalizeEvent(row) {
  return {
    id: String(row.id),
    title: row.title || "",
    description: row.description || "",
    date: normalizeDate(row.event_date),
    location: row.location || "",
    status: String(row.status || "draft").toLowerCase(),
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

// =========================================
// GET /api/events
//
// Query parameters:
// page, pageSize, day, from, to, q, status
// =========================================

export async function GET(req) {
  // 1. Verify admin authentication before accessing MySQL.
  const auth = await requireAdmin();

  if (!auth.authorized) {
    return NextResponse.json(
      {
        success: false,
        error: auth.message || "Authentication required.",
      },
      { status: auth.status || 401 }
    );
  }

  try {
    const url = new URL(req.url);

    // Pagination
    const pageValue = Number.parseInt(
      url.searchParams.get("page") || "1",
      10
    );

    const pageSizeValue = Number.parseInt(
      url.searchParams.get("pageSize") || "12",
      10
    );

    const page = Number.isFinite(pageValue)
      ? Math.max(1, pageValue)
      : 1;

    const pageSize = Number.isFinite(pageSizeValue)
      ? Math.min(50, Math.max(1, pageSizeValue))
      : 12;

    const offset = (page - 1) * pageSize;

    // Filters
    const day = url.searchParams.get("day");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const status = (
      url.searchParams.get("status") || ""
    )
      .trim()
      .toLowerCase();

    const q = (
      url.searchParams.get("q") || ""
    ).trim();

    const conditions = [];
    const params = [];

    // Status filter
    if (status && status !== "all") {
      if (!["draft", "published", "archived"].includes(status)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid event status",
          },
          { status: 400 }
        );
      }

      conditions.push("LOWER(status) = ?");
      params.push(status);
    }

    // Exact day filter: YYYYMMDD
    if (day) {
      if (!/^\d{8}$/.test(day)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid day format. Use YYYYMMDD.",
          },
          { status: 400 }
        );
      }

      const dayDate =
        `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;

      if (!isValidDate(dayDate)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid calendar date",
          },
          { status: 400 }
        );
      }

      conditions.push("event_date = ?");
      params.push(dayDate);
    }

    // Start date filter
    if (from) {
      if (!isValidDate(from)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid from date. Use YYYY-MM-DD.",
          },
          { status: 400 }
        );
      }

      conditions.push("event_date >= ?");
      params.push(from);
    }

    // End date filter
    if (to) {
      if (!isValidDate(to)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid to date. Use YYYY-MM-DD.",
          },
          { status: 400 }
        );
      }

      conditions.push("event_date <= ?");
      params.push(to);
    }

    // Search by title or location
    if (q) {
      conditions.push(
        "(LOWER(title) LIKE LOWER(?) OR LOWER(location) LIKE LOWER(?))"
      );

      params.push(`%${q}%`, `%${q}%`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // Count matching events
    const [countRows] = await pool.execute(
      `
        SELECT COUNT(*) AS total
        FROM events
        ${whereClause}
      `,
      params
    );

    const total = Number(countRows[0]?.total || 0);

    // Fetch the requested page
    const [rows] = await pool.execute(
      `
        SELECT
          id,
          title,
          description,
          event_date,
          location,
          status,
          created_at,
          updated_at
        FROM events
        ${whereClause}
        ORDER BY event_date DESC, created_at DESC
        LIMIT ? OFFSET ?
      `,
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
    console.error("GET /api/events error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch events",
      },
      { status: 500 }
    );
  }
}

// =========================================
// POST /api/events
//
// Create an event in MySQL
// =========================================

export async function POST(req) {
  // 1. Verify admin authentication before creating an event.
  const auth = await requireAdmin();

  if (!auth.authorized) {
    return NextResponse.json(
      {
        success: false,
        error: auth.message || "Authentication required.",
      },
      { status: auth.status || 401 }
    );
  }

  try {
    const body = await req.json();

    // Validate request
    const parsed = createEventSchema.parse(body);

    if (!isValidDate(parsed.date)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid date. Use YYYY-MM-DD.",
        },
        { status: 400 }
      );
    }

    // Generate a 32-character ID using MySQL.
    const [idRows] = await pool.query(
      "SELECT REPLACE(UUID(), '-', '') AS id"
    );

    const id = idRows[0].id;

    // MySQL DATETIME-compatible values
    const now = new Date();

    // Insert only actual schema columns.
    await pool.execute(
      `
        INSERT INTO events (
          id,
          title,
          description,
          event_date,
          location,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        parsed.title,
        parsed.description,
        parsed.date,
        parsed.location,
        parsed.status,
        now,
        now,
      ]
    );

    // Return the created record
    const [rows] = await pool.execute(
      `
        SELECT
          id,
          title,
          description,
          event_date,
          location,
          status,
          created_at,
          updated_at
        FROM events
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Event was created but could not be retrieved",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Event created successfully",
        data: normalizeEvent(rows[0]),
      },
      { status: 201 }
    );
  } catch (error) {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error("POST /api/events error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create event",
      },
      { status: 500 }
    );
  }
}