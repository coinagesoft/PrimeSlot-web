
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

const JWT_COOKIE = "session";
const JWT_SECRET = process.env.JWT_SECRET;

async function getMemberIdFromRequest(req) {
  const jar = await cookies();

  let token = jar.get(JWT_COOKIE)?.value || null;

  if (!token) {
    const auth = req.headers.get("authorization");

    if (auth?.startsWith("Bearer ")) {
      token = auth.slice("Bearer ".length).trim();
    }
  }

  if (!token || !JWT_SECRET) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload?.sub || null;
  } catch {
    return null;
  }
}

export async function POST(req) {
  const memberId = await getMemberIdFromRequest(req);

  if (!memberId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Fetch the existing member profile from MySQL.
    const [rows] = await pool.execute(
      `SELECT userProfile
       FROM members
       WHERE firebase_key = ?
       LIMIT 1`,
      [memberId]
    );

    if (!rows.length) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    const current = rows[0].userProfile;
    let currentProfile = null;

    if (typeof current === "string" && current.trim()) {
      try {
        currentProfile = JSON.parse(current);
      } catch {
        // Preserve a plain-text profile type, such as "Standard".
        currentProfile = current;
      }
    } else if (current && typeof current === "object") {
      currentProfile = current;
    }

    const now = Date.now();

    let newProfile;

    if (typeof currentProfile === "string") {
      newProfile = {
        type: currentProfile,
        approved: true,
        approvedAt: now,
        updatedAt: now,
      };
    } else if (
      currentProfile &&
      typeof currentProfile === "object" &&
      !Array.isArray(currentProfile)
    ) {
      newProfile = {
        ...currentProfile,
        approved: true,
        approvedAt: now,
        updatedAt: now,
      };
    } else {
      newProfile = {
        approved: true,
        approvedAt: now,
        updatedAt: now,
      };
    }

    // Save the updated profile as JSON in the MySQL LONGTEXT column.
    const [result] = await pool.execute(
      `UPDATE members
       SET userProfile = ?
       WHERE firebase_key = ?`,
      [JSON.stringify(newProfile), memberId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "Profile could not be updated" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      memberId,
      userProfile: newProfile,
      message: "Profile approved",
    });
  } catch (err) {
    console.error("approve-profile error:", err);

    return NextResponse.json(
      {
        error: "Failed to approve profile",
        details:
          process.env.NODE_ENV === "development"
            ? err.message
            : undefined,
      },
      { status: 500 }
    );
  }
}