export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import db from "@/lib/db";

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET;

const MEMBER_SELECT = `
  SELECT
    id,
    full_name,
    phone,
    email,
    business_name,
    business_category,
    chapter_name,
    region,
    city,
    member_status,
    traffic_light,
    profile_image_url,
    notes,
    firebase_uid,
    is_active,
    created_at,
    updated_at
  FROM members
`;

// --------------------------------------------------
// CORS
// --------------------------------------------------

function addCORS(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");

  res.headers.set(
    "Access-Control-Allow-Methods",
    "GET,PATCH,DELETE,OPTIONS"
  );

  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  return res;
}

function json(data, status = 200) {
  return addCORS(NextResponse.json(data, { status }));
}

export async function OPTIONS() {
  return json({}, 204);
}

// --------------------------------------------------
// MEMBER RESPONSE
// --------------------------------------------------

function buildMember(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    businessName: row.business_name,
    businessCategory: row.business_category,
    chapterName: row.chapter_name,
    region: row.region,
    city: row.city,
    memberStatus: row.member_status,
    trafficLight: row.traffic_light,
    profileImageUrl: row.profile_image_url,
    notes: row.notes,
    firebaseUid: row.firebase_uid,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --------------------------------------------------
// AUTHENTICATION
// JWT authentication is mandatory.
// No authentication bypass is permitted.
// --------------------------------------------------

async function requireUser(req) {
  // JWT secret validation
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw Object.assign(
      new Error("Server authentication configuration is invalid"),
      { status: 500 }
    );
  }

  // Read Authorization header
  const authorization = req.headers.get("authorization") || "";

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

  // Validate token payload
  if (
    typeof payload === "string" ||
    !payload.sub
  ) {
    throw Object.assign(
      new Error("Invalid authentication token"),
      { status: 401 }
    );
  }

  // Accept only the existing preview-login token format.
  // Replace these checks when production OTP login
  // issues its own properly verified member tokens.
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
    uid: String(payload.sub),
    payload,
  };
}

// --------------------------------------------------
// MEMBER OWNERSHIP
// A member can access only their own record.
// --------------------------------------------------

function requireOwnMember(user, memberId) {
  if (user.uid !== String(memberId)) {
    throw Object.assign(
      new Error("You are not authorized to access this member"),
      { status: 403 }
    );
  }
}

// --------------------------------------------------
// ROUTE PARAMETER
// --------------------------------------------------

async function getMemberId(params) {
  const paramsData = await params;

  return (
    paramsData?.id ||
    paramsData?.memberId ||
    paramsData?.memberid ||
    paramsData?.member ||
    null
  );
}

// --------------------------------------------------
// GET MEMBER
// GET /api/members/[id]
// Authentication required.
// Logged-in member can access their own details only.
// --------------------------------------------------

export async function GET(req, { params }) {
  try {
    // 1. Authentication
    const user = await requireUser(req);

    // 2. Get member ID
    const memberId = await getMemberId(params);

    if (!memberId) {
      return json(
        {
          success: false,
          error: "Missing member ID",
        },
        400
      );
    }

    // 3. Authorization
    requireOwnMember(user, memberId);

    // 4. Fetch member from MySQL
    const [rows] = await db.execute(
      `
        ${MEMBER_SELECT}
        WHERE id = ?
          AND is_active = 1
        LIMIT 1
      `,
      [memberId]
    );

    if (!rows.length) {
      return json(
        {
          success: false,
          error: "Member not found",
        },
        404
      );
    }

    // 5. Return member
    return json(
      {
        success: true,
        memberId: String(memberId),
        member: buildMember(rows[0]),
      },
      200
    );

  } catch (error) {
    console.error(
      "GET /api/members/[id] error:",
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

// --------------------------------------------------
// PATCH MEMBER
// PATCH /api/members/[id]
// Authentication required.
// Logged-in member can update their own details only.
// --------------------------------------------------

export async function PATCH(req, { params }) {
  try {
    // 1. Authentication
    const user = await requireUser(req);

    // 2. Get member ID
    const memberId = await getMemberId(params);

    if (!memberId) {
      return json(
        {
          success: false,
          error: "Missing member ID",
        },
        400
      );
    }

    // 3. Authorization
    requireOwnMember(user, memberId);

    // 4. Read request body
    const updateData = await req.json().catch(() => null);

    if (
      !updateData ||
      typeof updateData !== "object" ||
      Array.isArray(updateData)
    ) {
      return json(
        {
          success: false,
          error: "Invalid request body",
        },
        400
      );
    }

    // 5. Allowed member fields
    // Administrative fields cannot be updated by members.

    const allowedFields = {
      fullName: "full_name",
      phone: "phone",
      email: "email",
      businessName: "business_name",
      businessCategory: "business_category",
      chapterName: "chapter_name",
      region: "region",
      city: "city",
      profileImageUrl: "profile_image_url",
      notes: "notes",
    };

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      const column = allowedFields[key];

      if (!column) {
        continue;
      }

      if (
        value !== null &&
        typeof value === "object"
      ) {
        return json(
          {
            success: false,
            error: `Invalid value for ${key}`,
          },
          400
        );
      }

      fields.push(`${column} = ?`);
      values.push(value);
    }

    if (!fields.length) {
      return json(
        {
          success: false,
          error: "No valid member fields provided",
        },
        400
      );
    }

    // 6. Update MySQL record
    values.push(memberId);

    const [result] = await db.execute(
      `
        UPDATE members
        SET ${fields.join(", ")}
        WHERE id = ?
          AND is_active = 1
      `,
      values
    );

    if (!result.affectedRows) {
      // Check whether member exists
      const [existing] = await db.execute(
        `
          SELECT id
          FROM members
          WHERE id = ?
            AND is_active = 1
          LIMIT 1
        `,
        [memberId]
      );

      if (!existing.length) {
        return json(
          {
            success: false,
            error: "Member not found",
          },
          404
        );
      }
    }

    // 7. Fetch updated member
    const [updatedRows] = await db.execute(
      `
        ${MEMBER_SELECT}
        WHERE id = ?
          AND is_active = 1
        LIMIT 1
      `,
      [memberId]
    );

    if (!updatedRows.length) {
      return json(
        {
          success: false,
          error: "Member not found after update",
        },
        404
      );
    }

    // 8. Return updated member
    return json(
      {
        success: true,
        memberId: String(memberId),
        member: buildMember(updatedRows[0]),

        // Profile approval migration will be handled
        // separately after confirming the MySQL schema.
        autoApproved: {
          approved: 0,
          ids: [],
        },
      },
      200
    );

  } catch (error) {
    console.error(
      "PATCH /api/members/[id] error:",
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

// --------------------------------------------------
// DELETE MEMBER
// DELETE /api/members/[id]
// Authentication required.
// Account deletion is not permitted through this API.
// --------------------------------------------------

export async function DELETE(req, { params }) {
  try {
    // Authentication is mandatory.
    const user = await requireUser(req);

    // Verify that the requested ID belongs to this member.
    const memberId = await getMemberId(params);

    if (!memberId) {
      return json(
        {
          success: false,
          error: "Missing member ID",
        },
        400
      );
    }

    requireOwnMember(user, memberId);

    return json(
      {
        success: false,
        error: "Account deletion is not permitted through this API",
      },
      403
    );

  } catch (error) {
    console.error(
      "DELETE /api/members/[id] error:",
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