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

    // Compatibility field for the existing Flutter login flow.
    // Approval information must be obtained from the profile approval API
    // or an appropriate MySQL table if one exists.
    userProfile: {
      approved: false
    }
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

    // Bearer token is required.
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

    // Verify JWT.
    let decoded;

    try {
      decoded = jwt.verify(token, jwtSecret, {
        issuer: "prime-slot",
        audience: "prime-slot-client",
        algorithms: ["HS256"]
      });
    } catch (error) {
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

    // Accept only preview phone-login tokens.
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

    const memberId = decoded.sub.trim();

    // Fetch member using the actual MySQL primary key.
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
        WHERE id = ?
          AND is_active = 1
        LIMIT 1
      `,
      [memberId]
    );

    if (!rows.length) {
      return addCORS(
        NextResponse.json(
          {
            success: false,
            message: "Member not found or inactive"
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
          memberId: rows[0].id,
          member
        },
        { status: 200 }
      )
    );
  } catch (error) {
    console.error("Profile route MySQL error:", {
      message: error?.message,
      code: error?.code,
      sqlMessage: error?.sqlMessage
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