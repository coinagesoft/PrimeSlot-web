export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import db from "@/lib/db";

const MSG91_VERIFY_URL =
  "https://control.msg91.com/api/v5/widget/verifyAccessToken";

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

function phoneMatches(stored, verified) {
  const a = digitsOnly(stored);
  const b = digitsOnly(verified);

  return a.length >= 10 &&
    b.length >= 10 &&
    a.slice(-10) === b.slice(-10);
}

function extractVerifiedPhone(data) {
  const candidates = [
    data?.data?.mobile,
    data?.data?.identifier,
    data?.identifier,
    data?.mobile,
    data?.message
  ];

  for (const value of candidates) {
    if (value == null) continue;

    const digits = digitsOnly(value);

    // Only accept plausible phone-number lengths.
    if (digits.length >= 10 && digits.length <= 15) {
      return digits;
    }
  }

  return null;
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
    updatedAt: row.updated_at
  };
}

export async function POST(request) {
  try {
    const authKey = process.env.MSG91_AUTH_KEY;
    const jwtSecret = process.env.JWT_SECRET;

    if (!authKey) {
      return addCORS(NextResponse.json(
        { success: false, message: "MSG91 configuration missing" },
        { status: 500 }
      ));
    }

    if (!jwtSecret || jwtSecret.length < 32) {
      return addCORS(NextResponse.json(
        { success: false, message: "JWT configuration error" },
        { status: 500 }
      ));
    }

    const body = await request.json().catch(() => null);

    const accessToken =
      body?.accessToken ||
      body?.["access-token"] ||
      body?.token;

    if (!accessToken || typeof accessToken !== "string") {
      return addCORS(NextResponse.json(
        { success: false, message: "MSG91 access token required" },
        { status: 400 }
      ));
    }

    // 1. Verify the access token with MSG91.
    const msg91Response = await fetch(MSG91_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authkey: authKey
      },
      body: JSON.stringify({
        "access-token": accessToken
      }),
      cache: "no-store"
    });

    const msg91Data = await msg91Response.json().catch(() => null);

    // HTTP 200 alone does not mean MSG91 verification succeeded.
    const verified =
      msg91Response.ok &&
      msg91Data &&
      msg91Data.type !== "error" &&
      msg91Data.status !== "fail" &&
      msg91Data.hasError !== true &&
      msg91Data.code !== "201" &&
      (
        msg91Data.type === "success" ||
        msg91Data.status === "success" ||
        msg91Data.success === true
      );

    if (!verified) {
      console.error("MSG91 access-token verification failed:", {
        status: msg91Response.status,
        type: msg91Data?.type,
        code: msg91Data?.code
      });

      return addCORS(NextResponse.json(
        { success: false, message: "MSG91 OTP verification failed" },
        { status: 401 }
      ));
    }

    // 2. Get the verified phone from MSG91's response.
    const verifiedPhone = extractVerifiedPhone(msg91Data);

    if (!verifiedPhone) {
      // Never trust a phone number supplied separately by Flutter
      // as proof of OTP verification.
      console.error("MSG91 response did not contain a recognized phone field:", msg91Data);

      return addCORS(NextResponse.json(
        {
          success: false,
          message: "Could not identify verified mobile number from MSG91 response"
        },
        { status: 401 }
      ));
    }

    // 3. Match the verified phone against active MySQL members.
    const [rows] = await db.execute(`
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
    `);

    const memberRow = rows.find(row =>
      phoneMatches(row.phone, verifiedPhone)
    );

    if (!memberRow) {
      return addCORS(NextResponse.json(
        { success: false, message: "No active PrimeSlot member found" },
        { status: 404 }
      ));
    }

    const memberId = String(memberRow.id);

    // 4. Issue the PrimeSlot JWT after successful OTP verification.
    const expiresIn = 60 * 60 * 24 * 7;

    const token = jwt.sign(
      {
        sub: memberId,
        provider: "msg91",
        purpose: "member-login"
      },
      jwtSecret,
      {
        expiresIn,
        issuer: "prime-slot",
        audience: "prime-slot-client",
        algorithm: "HS256"
      }
    );

    return addCORS(NextResponse.json({
      success: true,
      message: "Login successful",
      token,
      tokenType: "Bearer",
      expiresIn,
      memberId,
      member: buildMember(memberRow)
    }));

  } catch (error) {
    console.error("verify-widget-token error:", {
      message: error?.message,
      code: error?.code
    });

    return addCORS(NextResponse.json(
      { success: false, message: "Unable to complete login" },
      { status: 500 }
    ));
  }
}