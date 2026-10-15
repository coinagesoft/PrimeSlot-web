
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

async function findMemberByPhoneDigits(inputDigits) {
  const [rows] = await db.execute(`
    SELECT
      firebase_key,
      record_data,
      phone,
      businessName,
      city,
      email,
      region,
      fullName,
      createdAt,
      updatedAt,
      chapterName,
      memberStatus,
      trafficLight,
      businessCategory,
      notes,
      userProfile
    FROM members
  `);

  for (const row of rows) {
    const record = parseJson(row.record_data);

    const candidates = [
      row.phone,
      record?.phone,
      record?.mobile,
      record?.phoneRaw
    ];

    if (!candidates.some(value => phoneMatches(value, inputDigits))) {
      continue;
    }

    const member = {
      ...((record && typeof record === "object" && !Array.isArray(record))
        ? record
        : {}),
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

    return { id: row.firebase_key, member };
  }

  return null;
}

export async function POST(request) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json().catch(() => ({}));

    const phoneRaw = String(
      body?.phone || body?.mobile || body?.identifier || ""
    ).trim();

    const otp = String(body?.otp || body?.code || "").trim();

    if (!phoneRaw || !otp) {
      return addCORS(
        NextResponse.json(
          { ok: false, message: "Phone and OTP required" },
          { status: 400 }
        )
      );
    }

    const phoneDigits = digitsOnly(phoneRaw);

    if (phoneDigits.length < 10) {
      return addCORS(
        NextResponse.json(
          { ok: false, message: "Invalid phone number" },
          { status: 400 }
        )
      );
    }

    const matched = await findMemberByPhoneDigits(phoneDigits);

    if (!matched) {
      return addCORS(
        NextResponse.json(
          { ok: false, message: "Member not found" },
          { status: 404 }
        )
      );
    }

    const authKey = process.env.MSG91_AUTHKEY;
    const jwtSecret = process.env.JWT_SECRET;

    if (!authKey || !jwtSecret) {
      console.error(`[verify-otp:${requestId}] Missing server configuration`, {
        msg91Configured: Boolean(authKey),
        jwtConfigured: Boolean(jwtSecret)
      });

      return addCORS(
        NextResponse.json(
          { ok: false, message: "Login service configuration error" },
          { status: 500 }
        )
      );
    }

    const verifyUrl = new URL(
      "https://control.msg91.com/api/v5/otp/verify"
    );

    verifyUrl.searchParams.set("mobile", phoneDigits);
    verifyUrl.searchParams.set("otp", otp);

    const resp = await fetch(verifyUrl.toString(), {
      method: "GET",
      headers: {
        authkey: authKey,
        accept: "application/json"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });

    const responseText = await resp.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = null;
    }

    // Log status and message only; do not log OTPs or credentials.
    console.info(`[verify-otp:${requestId}] MSG91 result`, {
      status: resp.status,
      message: data?.message ?? data?.errors ?? "No message"
    });

    if (!resp.ok) {
      return addCORS(
        NextResponse.json(
          { ok: false, message: "OTP provider request failed" },
          { status: 502 }
        )
      );
    }

    const providerMessage = String(data?.message ?? "").toLowerCase();

    const success =
      providerMessage === "otp verified success" ||
      providerMessage === "number_verified_successfully";

    if (!success) {
      return addCORS(
        NextResponse.json(
          { ok: false, message: "OTP verification failed" },
          { status: 400 }
        )
      );
    }

    const configuredMaxAge = Number(process.env.JWT_MAX_AGE || 604800);
    const maxAge =
      Number.isSafeInteger(configuredMaxAge) && configuredMaxAge > 0
        ? configuredMaxAge
        : 604800;

    const token = jwt.sign(
      {
        sub: matched.id,
        provider: "msg91"
      },
      jwtSecret,
      { expiresIn: maxAge }
    );

    const response = NextResponse.json({
      ok: true,
      message: "OTP verified successfully",
      memberId: matched.id,
      member: matched.member
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      path: "/",
      maxAge,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });

    return addCORS(response);
  } catch (error) {
    const timedOut =
      error?.name === "TimeoutError" ||
      error?.name === "AbortError";

    console.error(`[verify-otp:${requestId}] Error`, {
      name: error?.name,
      code: error?.code,
      message: error?.message
    });

    return addCORS(
      NextResponse.json(
        {
          ok: false,
          message: timedOut
            ? "OTP provider timed out. Please try again."
            : "Unable to verify OTP"
        },
        { status: timedOut ? 504 : 500 }
      )
    );
  }
}
