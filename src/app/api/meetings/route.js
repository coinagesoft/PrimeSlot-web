// src/app/api/meetings/route.js

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "../../../lib/db";
import jwt from "jsonwebtoken";

// ======================================================
// CONFIGURATION
// ======================================================

const ADMIN_COOKIE = "admin_session";
const JWT_COOKIE = "session";

const JWT_SECRET = process.env.JWT_SECRET;
const DISABLE_AUTH = process.env.DISABLE_AUTH === "true";

// ======================================================
// CORS
// ======================================================

function addCORS(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  return response;
}

function jsonResponse(data, status = 200) {
  return addCORS(NextResponse.json(data, { status }));
}

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

// ======================================================
// JSON VALUE DECODER
// ======================================================

/**
 * Decode JSON-encoded values stored in MySQL.
 *
 * Examples:
 *   '"approved"' -> 'approved'
 *   '"member123"' -> 'member123'
 *   'true' -> true
 *   '123' -> 123
 *   '{"name":"Test"}' -> { name: "Test" }
 *
 * Ordinary strings remain unchanged.
 */
function decodeJsonValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// ======================================================
// MEMBER AUTHENTICATION
// ======================================================

/**
 * Authenticate using:
 *
 * 1. DISABLE_AUTH test mode, if enabled.
 * 2. Bearer JWT.
 * 3. JWT session cookie.
 *
 * This endpoint only allows authenticated members.
 */
async function requireUser(request) {
  if (DISABLE_AUTH) {
    return {
      mode: "test",
      uid: "TEST_MEMBER_001",
    };
  }

  if (!JWT_SECRET) {
    throw Object.assign(
      new Error("JWT_SECRET is not configured."),
      { status: 500 }
    );
  }

  // ----------------------------------------------------
  // 1. Bearer JWT
  // ----------------------------------------------------

  const authorization = request.headers.get("authorization") || "";

  if (authorization.startsWith("Bearer ")) {
    const token = authorization.slice(7).trim();

    try {
      const payload = jwt.verify(token, JWT_SECRET);

      if (
        payload &&
        typeof payload.sub === "string" &&
        payload.sub.trim()
      ) {
        return {
          mode: "member",
          uid: payload.sub,
          payload,
        };
      }
    } catch {
      // Continue to cookie authentication.
    }
  }

  // ----------------------------------------------------
  // 2. JWT session cookie
  // ----------------------------------------------------

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(JWT_COOKIE)?.value;

  if (sessionToken) {
    try {
      const payload = jwt.verify(sessionToken, JWT_SECRET);

      if (
        payload &&
        typeof payload.sub === "string" &&
        payload.sub.trim()
      ) {
        return {
          mode: "member",
          uid: payload.sub,
          payload,
        };
      }
    } catch {
      // Continue to the admin-cookie check.
    }
  }

  // ----------------------------------------------------
  // 3. Admin cookie
  // ----------------------------------------------------

  const adminSession = cookieStore.get(ADMIN_COOKIE)?.value;

  if (adminSession) {
    throw Object.assign(
      new Error("Admin sessions cannot access this member endpoint."),
      { status: 403 }
    );
  }

  throw Object.assign(
    new Error("Unauthorized"),
    { status: 401 }
  );
}

// ======================================================
// MEETING NORMALIZATION
// ======================================================

/**
 * Convert a MySQL meeting row into the API response format.
 *
 * record_data may contain additional meeting properties.
 * Explicit database columns take precedence over record_data.
 */
function normalizeMeeting(row) {
  let record = {};

  if (row.record_data) {
    const decodedRecord = decodeJsonValue(row.record_data);

    if (
      decodedRecord &&
      typeof decodedRecord === "object" &&
      !Array.isArray(decodedRecord)
    ) {
      record = decodedRecord;
    }
  }

  return {
    ...record,

    meetingId: row.firebase_key,

    aId: decodeJsonValue(row.aId),
    bId: decodeJsonValue(row.bId),

    mode: decodeJsonValue(row.mode),
    notes: decodeJsonValue(row.notes),
    place: decodeJsonValue(row.place),

    status: decodeJsonValue(row.status),
    eventId: decodeJsonValue(row.eventId),
    outcome: decodeJsonValue(row.outcome),

    createdAt: decodeJsonValue(row.createdAt),
    createdBy: decodeJsonValue(row.createdBy),
    updatedAt: decodeJsonValue(row.updatedAt),

    durationMin: decodeJsonValue(row.durationMin),
    scheduledAt: decodeJsonValue(row.scheduledAt),

    businessGivenByA: decodeJsonValue(row.businessGivenByA),
    businessGivenByB: decodeJsonValue(row.businessGivenByB),

    referralsGivenByA: decodeJsonValue(row.referralsGivenByA),
    referralsGivenByB: decodeJsonValue(row.referralsGivenByB),

    topic: decodeJsonValue(row.topic),
  };
}

// ======================================================
// APPROVAL CHECK
// ======================================================

/**
 * Preserve the approval checks from the existing API.
 *
 * A meeting is approved when one of these conditions holds:
 *
 * - approved === true
 * - isApproved === true
 * - status === "approved"
 * - approval === "approved"
 * - approvedAt exists
 */
function isMeetingApproved(meeting) {
  if (!meeting || typeof meeting !== "object") {
    return false;
  }

  const approved = decodeJsonValue(meeting.approved);
  const isApproved = decodeJsonValue(meeting.isApproved);

  const status = decodeJsonValue(meeting.status);
  const approval = decodeJsonValue(meeting.approval);

  const approvedAt = decodeJsonValue(meeting.approvedAt);

  if (approved === true || isApproved === true) {
    return true;
  }

  if (
    typeof status === "string" &&
    status.trim().toLowerCase() === "approved"
  ) {
    return true;
  }

  if (
    typeof approval === "string" &&
    approval.trim().toLowerCase() === "approved"
  ) {
    return true;
  }

  if (approvedAt) {
    return true;
  }

  return false;
}

// ======================================================
// EVENT ID NORMALIZATION
// ======================================================

/**
 * Standalone meetings must return eventId: null.
 */
function normalizeEventId(eventId) {
  if (
    eventId === null ||
    eventId === undefined ||
    eventId === "" ||
    eventId === "undefined" ||
    eventId === "standalone"
  ) {
    return null;
  }

  return String(eventId);
}

// ======================================================
// GET /api/meetings
// ======================================================

/**
 * Fetch approved meetings associated with the authenticated member.
 *
 * MySQL table:
 *   meetings
 *
 * Expected columns include:
 *   firebase_key
 *   record_data
 *   aId
 *   bId
 *   eventId
 *   status
 *   scheduledAt
 *
 * This implementation assumes aId and bId contain the
 * participating member IDs.
 */
export async function GET(request) {
  try {
    // --------------------------------------------------
    // 1. Authenticate user
    // --------------------------------------------------

    const user = await requireUser(request);

    if (user.mode !== "member" && user.mode !== "test") {
      return jsonResponse(
        { error: "Not allowed" },
        403
      );
    }

    const memberId = String(user.uid);

    // --------------------------------------------------
    // 2. Find meetings associated with this member
    // --------------------------------------------------

    /*
     * Some imported values are stored as plain strings;
     * others are JSON-encoded strings.
     *
     * Example:
     *   member123
     *   "member123"
     */

    const rawId = memberId;
    const jsonId = JSON.stringify(memberId);

    const [rows] = await pool.execute(
      `
        SELECT *
        FROM meetings
        WHERE aId IN (?, ?)
           OR bId IN (?, ?)
        ORDER BY scheduledAt DESC
      `,
      [
        rawId,
        jsonId,
        rawId,
        jsonId,
      ]
    );

    // --------------------------------------------------
    // 3. Normalize and filter meetings
    // --------------------------------------------------

    const meetings = [];

    for (const row of rows) {
      const meeting = normalizeMeeting(row);

      // Return only approved meetings.
      if (!isMeetingApproved(meeting)) {
        continue;
      }

      meetings.push({
        ...meeting,
        eventId: normalizeEventId(meeting.eventId),
      });
    }

    // --------------------------------------------------
    // 4. Return API response
    // --------------------------------------------------

    return jsonResponse(
      {
        meetings,
      },
      200
    );
  } catch (error) {
    console.error(
      "GET /api/meetings error:",
      error
    );

    return jsonResponse(
      {
        error: error.message || "Failed to fetch meetings.",
      },
      error.status || 500
    );
  }
}