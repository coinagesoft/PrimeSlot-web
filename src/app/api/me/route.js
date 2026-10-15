
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import db from "@/lib/db";

function addCORS(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization"
  );
  return res;
}

export async function OPTIONS() {
  return addCORS(new NextResponse(null, { status: 204 }));
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

function buildMember(row) {
  const record = parseJson(row.record_data);

  return {
    ...((record && typeof record === "object" && !Array.isArray(record))
      ? record
      : {}),
    firebase_key: row.firebase_key,
    phone: parseJson(row.phone),
    businessName: parseJson(row.businessName),
    city: parseJson(row.city),
    email: parseJson(row.email),
    region: parseJson(row.region),
    fullName: parseJson(row.fullName),
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

export async function GET(request) {
  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured");

      return addCORS(
        NextResponse.json(
          { success: false, message: "Authentication configuration error" },
          { status: 500 }
        )
      );
    }

    const authorization = request.headers.get("authorization") || "";

    let token = null;

    if (authorization.startsWith("Bearer ")) {
      token = authorization.slice(7).trim();
    } else {
      token = request.cookies.get("session")?.value || null;
    }

    if (!token) {
      return addCORS(
        NextResponse.json(
          { success: false, message: "Missing token" },
          { status: 401 }
        )
      );
    }

    let decoded;

    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch {
      return addCORS(
        NextResponse.json(
          { success: false, message: "Token expired or invalid" },
          { status: 401 }
        )
      );
    }

    const memberId = decoded.sub;

    if (
      typeof memberId !== "string" ||
      !memberId.trim() ||
      decoded.provider !== "check-user" ||
      decoded.purpose !== "test-preview"
    ) {
      return addCORS(
        NextResponse.json(
          { success: false, message: "Invalid token payload" },
          { status: 401 }
        )
      );
    }

    const [rows] = await db.execute(
      `
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
        WHERE firebase_key = ?
        LIMIT 1
      `,
      [memberId]
    );

    if (!rows.length) {
      return addCORS(
        NextResponse.json(
          { success: false, message: "Member not found" },
          { status: 404 }
        )
      );
    }

    const member = buildMember(rows[0]);

    return addCORS(
      NextResponse.json(
        {
          success: true,
          memberId,
          member
        },
        { status: 200 }
      )
    );
  } catch (error) {
    console.error("me route MySQL error:", {
      message: error?.message,
      code: error?.code
    });

    return addCORS(
      NextResponse.json(
        { success: false, message: "Unable to load member profile" },
        { status: 500 }
      )
    );
  }
}
