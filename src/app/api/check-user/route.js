export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import db from "@/lib/db";

function addCORS(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization"
  );
  return res;
}

export async function OPTIONS() {
  return addCORS(new NextResponse(null, { status: 204 }));
}

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function phoneMatches(storedValue, inputDigits) {
  const storedDigits = digitsOnly(storedValue);

  if (storedDigits.length < 10 || inputDigits.length < 10) {
    return false;
  }

  return (
    storedDigits === inputDigits ||
    storedDigits.slice(-10) === inputDigits.slice(-10)
  );
}

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

export async function POST(request) {
  let stage = "initialization";

  try {
    // Preview-only login. Keep disabled unless explicitly enabled.
    stage = "preview-login-check";

    if (process.env.PREVIEW_PHONE_LOGIN_ENABLED !== "true") {
      return addCORS(
        NextResponse.json(
          {
            ok: false,
            message: "Preview login is disabled"
          },
          { status: 404 }
        )
      );
    }

    stage = "jwt-configuration";

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret || jwtSecret.length < 32) {
      console.error("JWT_SECRET is missing or too short");

      return addCORS(
        NextResponse.json(
          {
            ok: false,
            message: "Authentication configuration error"
          },
          { status: 500 }
        )
      );
    }

    stage = "request-body";

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return addCORS(
        NextResponse.json(
          {
            ok: false,
            exists: false,
            message: "Request body must be valid JSON"
          },
          { status: 400 }
        )
      );
    }

    const phoneRaw = String(
      body.phone || body.mobile || body.identifier || ""
    ).trim();

    if (!phoneRaw) {
      return addCORS(
        NextResponse.json(
          {
            ok: false,
            exists: false,
            message: "Phone required"
          },
          { status: 400 }
        )
      );
    }

    const inputDigits = digitsOnly(phoneRaw);

    if (inputDigits.length < 10) {
      return addCORS(
        NextResponse.json(
          {
            ok: false,
            exists: false,
            message: "Invalid phone"
          },
          { status: 400 }
        )
      );
    }

    stage = "mysql-member-query";

    const [rows] = await db.execute(
      `
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
      WHERE is_active = 1
      `
    );

    stage = "phone-matching";

    const foundRow = rows.find(row =>
      phoneMatches(row.phone, inputDigits)
    );

    if (!foundRow) {
      return addCORS(
        NextResponse.json({
          ok: true,
          exists: false,
          member: null,
          message: "No registered member found for this phone number"
        })
      );
    }

    stage = "build-member";

    const member = buildMember(foundRow);

    // Use MySQL primary key instead of the removed Firebase key.
    const memberId = String(foundRow.id ?? "").trim();

    if (!memberId) {
      throw new Error("Matched member has no MySQL id");
    }

    stage = "generate-jwt";

    const expiresIn = 60 * 60;

    const token = jwt.sign(
      {
        sub: memberId,
        provider: "check-user",
        purpose: "test-preview"
      },
      jwtSecret,
      {
        expiresIn,
        issuer: "prime-slot",
        audience: "prime-slot-client",
        algorithm: "HS256"
      }
    );

    stage = "send-response";

    return addCORS(
      NextResponse.json({
        ok: true,
        exists: true,
        message: "Preview token generated",
        token,
        tokenType: "Bearer",
        expiresIn,
        memberId,
        member
      })
    );
  } catch (error) {
    console.error("check-user failed:", {
      stage,
      message: error?.message,
      code: error?.code,
      sqlMessage: error?.sqlMessage
    });

    const isProduction = process.env.NODE_ENV === "production";

    return addCORS(
      NextResponse.json(
        {
          ok: false,
          exists: false,
          message: "Unable to check member",
          stage,
          ...(
            !isProduction
              ? {
                  error: error?.message || "Unknown error",
                  code: error?.code || null
                }
              : {}
          )
        },
        { status: 500 }
      )
    );
  }
}