import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET;

// --------------------------------------------------
// RESPONSE HELPER
// --------------------------------------------------

function response(data, status = 200) {
  return NextResponse.json(data, { status });
}

// --------------------------------------------------
// DATE HELPER
// --------------------------------------------------

function formatDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

// --------------------------------------------------
// AUTHENTICATION
// Supports Admin Panel and Flutter App.
// No authentication bypass.
// --------------------------------------------------

async function authenticateRequest(req) {
  const authorization = req.headers.get("authorization") || "";

  // ------------------------------------------------
  // 1. ADMIN AUTHENTICATION
  // ------------------------------------------------

  // If there is no Bearer token, try existing admin
  // session authentication.
  if (!authorization.startsWith("Bearer ")) {
    const adminAuth = await requireAdmin();

    if (adminAuth?.authorized) {
      return {
        success: true,
        role: "admin",
      };
    }

    throw Object.assign(
      new Error(
        adminAuth?.message || "Authentication required."
      ),
      {
        status: adminAuth?.status || 401,
      }
    );
  }

  // ------------------------------------------------
  // 2. MOBILE MEMBER JWT AUTHENTICATION
  // ------------------------------------------------

  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw Object.assign(
      new Error("JWT authentication configuration is invalid"),
      { status: 500 }
    );
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    throw Object.assign(
      new Error("Authorization token is required"),
      { status: 401 }
    );
  }

  let payload;

  try {
    payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "prime-slot",
      audience: "prime-slot-client",
    });
  } catch {
    throw Object.assign(
      new Error("Invalid or expired authentication token"),
      { status: 401 }
    );
  }

  if (
    typeof payload === "string" ||
    !payload.sub
  ) {
    throw Object.assign(
      new Error("Invalid authentication token"),
      { status: 401 }
    );
  }

  // Existing mobile preview token format.
  // Update this condition when production OTP login
  // starts issuing verified member tokens.
  if (
    payload.provider !== "check-user" ||
    payload.purpose !== "test-preview"
  ) {
    throw Object.assign(
      new Error("Invalid member authentication token"),
      { status: 401 }
    );
  }

  return {
    success: true,
    role: "member",
    memberId: String(payload.sub),
  };
}

// --------------------------------------------------
// VERIFY MEMBER EXISTS
// --------------------------------------------------

async function verifyMember(memberId) {
  const [rows] = await pool.execute(
    `
      SELECT id
      FROM members
      WHERE id = ?
        AND is_active = 1
      LIMIT 1
    `,
    [memberId]
  );

  return rows.length > 0;
}

// --------------------------------------------------
// GET MEETINGS
// Admin: All meetings
// Member: Only their own meetings
// --------------------------------------------------

export async function GET(req) {
  try {
    // 1. Authenticate request
    const auth = await authenticateRequest(req);

    // 2. Build query based on authenticated role
    let query = `
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
    `;

    const values = [];

    // 3. Member can only see meetings in which
    // they are participant A or participant B.
    if (auth.role === "member") {
      const memberExists = await verifyMember(auth.memberId);

      if (!memberExists) {
        return response(
          {
            success: false,
            message: "Member not found or inactive.",
          },
          404
        );
      }

      query += `
        WHERE (
          m.a_id = ?
          OR m.b_id = ?
        )
      `;

      values.push(auth.memberId, auth.memberId);
    }

    // 4. Sort meetings
    query += `
      ORDER BY m.scheduled_at DESC
    `;

    // 5. Execute MySQL query
    const [rows] = await pool.execute(query, values);

    // 6. Format response
    const meetings = rows.map((row) => ({
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

      scheduledAt: formatDate(row.scheduled_at),
      endTime: formatDate(row.end_time),

      durationMin: Number(row.duration_min || 30),

      mode: row.mode || "inperson",
      place: row.place || "",
      topic: row.topic || "",
      notes: row.notes || "",

      status: String(
        row.status || "pending"
      ).toLowerCase(),

      createdBy: row.created_by || null,

      respondedAt: formatDate(row.responded_at),

      createdAt: formatDate(row.created_at),

      updatedAt: formatDate(row.updated_at),
    }));

    // 7. Return meetings
    return response({
      success: true,
      role: auth.role,
      meetings,
      total: meetings.length,
    });

  } catch (error) {
    console.error("GET /api/meetings error:", error);

    return response(
      {
        success: false,
        message: error.message || "Failed to fetch meetings.",
      },
      error.status || 500
    );
  }
}