
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import db from "@/lib/db";

function addCORS(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  return res;
}

export async function OPTIONS() {
  return addCORS(new NextResponse(null, { status: 204 }));
}

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function parseJson(value) {
  if (value == null) return null;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractPhoneValue(value) {
  value = parseJson(value);

  if (value == null) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    const keys = [
      "Value", "value", "phone", "Phone",
      "mobile", "Mobile", "number", "phoneRaw", "contact"
    ];

    for (const key of keys) {
      if (value[key] != null) {
        const result = extractPhoneValue(value[key]);
        if (result) return result;
      }
    }

    for (const item of Object.values(value)) {
      const result = extractPhoneValue(item);
      if (result) return result;
    }
  }

  return "";
}

function phoneMatches(storedValue, inputDigits) {
  const storedDigits = digitsOnly(extractPhoneValue(storedValue));

  if (storedDigits.length < 10 || inputDigits.length < 10) {
    return false;
  }

  return (
    storedDigits === inputDigits ||
    storedDigits.slice(-10) === inputDigits.slice(-10)
  );
}

function buildMember(row) {
  const record = parseJson(row.record_data);

  return {
    ...(
      record && typeof record === "object" && !Array.isArray(record)
        ? record
        : {}
    ),
    firebase_key: row.firebase_key,
    phone: parseJson(row.phone),
    businessName: parseJson(row.businessName),
    city: parseJson(row.city),
    email: parseJson(row.email),
    region: parseJson(row.region),
    fullName: parseJson(row.fullName) ?? record?.fullName ?? null,
    createdAt: parseJson(row.createdAt),
    updatedAt: parseJson(row.updatedAt),
    chapterName: parseJson(row.chapterName),
    memberStatus: parseJson(row.memberStatus),
    trafficLight: parseJson(row.trafficLight),
    businessCategory: parseJson(row.businessCategory),
    notes: parseJson(row.notes),
    userProfile: parseJson(row.userProfile)
  };
}

export async function POST(request) {
  try {
    // Explicitly enable only for your dummy-data preview deployment.
    if (process.env.PREVIEW_PHONE_LOGIN_ENABLED !== "true") {
      return addCORS(
        NextResponse.json(
          { ok: false, message: "Preview login is disabled" },
          { status: 404 }
        )
      );
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return addCORS(
        NextResponse.json(
          { ok: false, message: "Authentication configuration error" },
          { status: 500 }
        )
      );
    }

    const body = await request.json().catch(() => ({}));
    const phoneRaw = String(
      body?.phone || body?.mobile || body?.identifier || ""
    ).trim();

    if (!phoneRaw) {
      return addCORS(
        NextResponse.json(
          { ok: false, exists: false, message: "Phone required" },
          { status: 400 }
        )
      );
    }

    const inputDigits = digitsOnly(phoneRaw);

    if (inputDigits.length < 10) {
      return addCORS(
        NextResponse.json(
          { ok: false, exists: false, message: "Invalid phone" },
          { status: 400 }
        )
      );
    }

    const [rows] = await db.execute(`
      SELECT
        firebase_key, record_data, phone, businessName, city, email,
        region, fullName, createdAt, updatedAt, chapterName,
        memberStatus, trafficLight, businessCategory, notes, userProfile
      FROM members
    `);

    let foundRow = null;

    for (const row of rows) {
      const record = parseJson(row.record_data);

      const candidates = [
        row.phone,
        record?.phone,
        record?.mobile,
        record?.phoneRaw
      ];

      if (candidates.some(value => phoneMatches(value, inputDigits))) {
        foundRow = row;
        break;
      }
    }

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

    const member = buildMember(foundRow);
    const memberId = String(foundRow.firebase_key);

    const maxAge = 60 * 60;

    const token = jwt.sign(
      {
        sub: memberId,
        provider: "check-user",
        purpose: "test-preview"
      },
      jwtSecret,
      { expiresIn: maxAge }
    );

    const response = NextResponse.json({
      ok: true,
      exists: true,
      message: "Preview login successful",
      memberId,
      member
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge
    });

    return addCORS(response);
  } catch (error) {
    console.error("check-user MySQL error:", {
      message: error?.message,
      code: error?.code
    });

    return addCORS(
      NextResponse.json(
        { ok: false, exists: false, message: "Unable to check member" },
        { status: 500 }
      )
    );
  }
}
