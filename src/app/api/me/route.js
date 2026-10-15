
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
    ...(
      record &&
      typeof record === "object" &&
      !Array.isArray(record)
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

export async function GET(request) {
  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret || jwtSecret.length < 32) {
      console.error("JWT_SECRET is missing or too short");

      return addCORS(
        NextResponse.json(
          {
            success: false,
            message: "Authentication configuration error"
          },
          { status: 500 }
        )
      );
    }

    // Bearer token is required. Cookies are not accepted.
    const authorization = request.headers.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+(\S+)$/i);
    const token = match?.[1];

    if (!token) {
      return addCORS(
        NextResponse.json(
          {
            success: false,
            message: "Bearer token required"
          },
          { status: 401 }
        )
      );
    }

    let decoded;

    try {
      decoded = jwt.verify(token, jwtSecret, {
        issuer: "prime-slot",
        audience: "prime-slot-client",
        algorithms: ["HS256"]
      });
    } catch {
      return addCORS(
        NextResponse.json(
          {
            success: false,
            message: "Token expired or invalid"
          },
          { status: 401 }
        )
      );
    }

    // Accept only tokens issued by the preview phone-login endpoint.
    if (
      !decoded ||
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      !decoded.sub.trim() ||
      decoded.provider !== "check-user" ||
      decoded.purpose !== "test-preview"
    ) {
      return addCORS(
        NextResponse.json(
          {
            success: false,
            message: "Invalid token payload"
          },
          { status: 401 }
        )
      );
    }

    const memberId = decoded.sub;

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
          {
            success: false,
            message: "Member not found"
          },
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
    console.error("Profile route MySQL error:", {
      message: error?.message,
      code: error?.code
    });

    return addCORS(
      NextResponse.json(
        {
          success: false,
          message: "Unable to load member profile"
        },
        { status: 500 }
      )
    );
  }
}
