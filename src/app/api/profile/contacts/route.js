// src/app/api/profile/contacts/route.js

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import db from "@/lib/db";

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET;

// --------------------------------------------------
// CORS
// --------------------------------------------------

function addCORS(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");

  res.headers.set(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS"
  );

  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  return res;
}

function json(data, status = 200) {
  return addCORS(
    NextResponse.json(data, { status })
  );
}

export async function OPTIONS() {
  return json({}, 204);
}

// --------------------------------------------------
// DATE FORMATTER
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
// Flutter mobile app JWT authentication only.
// No bypass, cookies or Firebase authentication.
// --------------------------------------------------

async function requireUser(req) {
  // Check JWT secret
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw Object.assign(
      new Error("JWT authentication configuration is invalid"),
      { status: 500 }
    );
  }

  // Read Authorization header
  const authorization =
    req.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    throw Object.assign(
      new Error("Authorization token is required"),
      { status: 401 }
    );
  }

  // Extract token
  const token = authorization.slice(7).trim();

  if (!token) {
    throw Object.assign(
      new Error("Authorization token is required"),
      { status: 401 }
    );
  }

  let payload;

  // Verify JWT
  try {
    payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "prime-slot",
      audience: "prime-slot-client",
    });
  } catch (error) {
    throw Object.assign(
      new Error("Invalid or expired authentication token"),
      { status: 401 }
    );
  }

  // Validate payload
  if (
    typeof payload === "string" ||
    !payload.sub
  ) {
    throw Object.assign(
      new Error("Invalid authentication token"),
      { status: 401 }
    );
  }

  // Validate existing mobile login token format.
  // This must be updated when production OTP login
  // issues its verified member tokens.
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
    memberId: String(payload.sub),
  };
}

// --------------------------------------------------
// GET MEMBER CONTACTS
//
// GET /api/profile/contacts
//
// Authentication:
// Logged-in mobile member only.
//
// Data:
// Returns only contacts belonging to the
// authenticated member.
// --------------------------------------------------

export async function GET(req) {
  try {
    // -----------------------------------------------
    // 1. AUTHENTICATION
    // -----------------------------------------------

    const user = await requireUser(req);

    const memberId = user.memberId;

    // -----------------------------------------------
    // 2. VERIFY LOGGED-IN MEMBER
    // -----------------------------------------------

    const [memberRows] = await db.execute(
      `
        SELECT id
        FROM members
        WHERE id = ?
          AND is_active = 1
        LIMIT 1
      `,
      [memberId]
    );

    if (!memberRows.length) {
      return json(
        {
          success: false,
          message: "Member not found or inactive.",
        },
        404
      );
    }

    // -----------------------------------------------
    // 3. FETCH CONTACTS FROM MYSQL
    // -----------------------------------------------

    const [rows] = await db.execute(
      `
        SELECT
          c.contact_id,
          c.added_at,
          c.meeting_id,

          m.full_name,
          m.phone,
          m.email,
          m.profile_image_url

        FROM contacts c

        INNER JOIN members m
          ON m.id = c.contact_id

        WHERE c.member_id = ?
          AND m.is_active = 1

        ORDER BY c.added_at DESC
      `,
      [memberId]
    );

    // -----------------------------------------------
    // 4. FORMAT CONTACT RESPONSE
    // -----------------------------------------------

    const contacts = rows.map((row) => ({
      id: String(row.contact_id),

      name: row.full_name || "Unknown",

      phone: row.phone || "",

      email: row.email || "",

      profile: row.profile_image_url || "",

      addedAt: formatDate(row.added_at),

      meetingId: row.meeting_id
        ? String(row.meeting_id)
        : null,
    }));

    // -----------------------------------------------
    // 5. SUCCESS RESPONSE
    // -----------------------------------------------

    return json(
      {
        success: true,
        contacts,
        total: contacts.length,
      },
      200
    );

  } catch (error) {
    console.error(
      "GET /api/profile/contacts error:",
      error
    );

    return json(
      {
        success: false,
        error: error.message || "Server error",
      },
      error.status || 500
    );
  }
}