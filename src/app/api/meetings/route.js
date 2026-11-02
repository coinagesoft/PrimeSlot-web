// src/app/api/meetings/route.js

import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(data, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET() {
  try {
    // Authenticate the administrator.
    const auth = await requireAdmin();

    if (!auth?.authorized) {
      return response(
        {
          success: false,
          message: auth?.message || "Authentication required.",
        },
        auth?.status || 401
      );
    }

    // Fetch all meetings, including pending and canceled.
    const [rows] = await pool.execute(`
      SELECT
        m.id,
        m.event_id,
        m.a_id,
        m.b_id,
        m.scheduled_at,
        m.end_time,
        m.duration_min,
        m.mode,
        m.place,
        m.topic,
        m.notes,
        m.status,
        m.created_by,
        m.responded_at,
        m.created_at,
        m.updated_at,

        a.full_name AS a_name,
        a.business_name AS a_business,

        b.full_name AS b_name,
        b.business_name AS b_business,

        e.title AS event_title

      FROM meetings m

      LEFT JOIN members a
        ON a.id = m.a_id

      LEFT JOIN members b
        ON b.id = m.b_id

      LEFT JOIN events e
        ON e.id = m.event_id

      ORDER BY m.scheduled_at DESC
    `);

    const meetings = rows.map((row) => {
      const scheduledAt = row.scheduled_at
        ? new Date(row.scheduled_at).toISOString()
        : null;

      const endTime = row.end_time
        ? new Date(row.end_time).toISOString()
        : null;

      return {
        id: String(row.id),
        meetingId: String(row.id),

        eventId: row.event_id
          ? String(row.event_id)
          : null,

        eventTitle: row.event_title || "Unknown event",

        aId: String(row.a_id),
        bId: String(row.b_id),

        aName: row.a_name || "Unknown member",
        aBusiness: row.a_business || "",

        bName: row.b_name || "Unknown member",
        bBusiness: row.b_business || "",

        scheduledAt,
        endTime,

        durationMin: Number(row.duration_min || 30),

        mode: row.mode || "inperson",
        place: row.place || "",
        topic: row.topic || "",
        notes: row.notes || "",

        status: String(row.status || "pending").toLowerCase(),

        createdBy: row.created_by || null,
        respondedAt: row.responded_at
          ? new Date(row.responded_at).toISOString()
          : null,

        createdAt: row.created_at
          ? new Date(row.created_at).toISOString()
          : null,

        updatedAt: row.updated_at
          ? new Date(row.updated_at).toISOString()
          : null,
      };
    });

    return response({
      success: true,
      meetings,
      total: meetings.length,
    });
  } catch (error) {
    console.error("GET /api/meetings error:", error);

    return response(
      {
        success: false,
        message: "Failed to fetch meetings.",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      },
      500
    );
  }
}