// src/app/api/profile/upload/route.js

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import db from "@/lib/db";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_COOKIE = "session";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// --------------------------------------------------
// AUTHENTICATION
// --------------------------------------------------

async function getMemberIdFromRequest(req) {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET_MISSING");
  }

  let token = null;

  const auth = req.headers.get("authorization");

  if (auth?.startsWith("Bearer ")) {
    token = auth.substring(7).trim();
  }

  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get(JWT_COOKIE)?.value || null;
  }

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (
      !payload ||
      typeof payload === "string" ||
      !payload.sub
    ) {
      return null;
    }

    return String(payload.sub);
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return null;
  }
}

// --------------------------------------------------
// IMAGE VALIDATION
// --------------------------------------------------

function isValidImage(buffer, type) {
  if (type === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (type === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      )
    );
  }

  if (type === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }

  return false;
}

// --------------------------------------------------
// POST: UPLOAD PROFILE IMAGE
// --------------------------------------------------

export async function POST(req) {
  let savedFilePath = null;

  try {
    // 1. Authenticate member

    const memberId = await getMemberIdFromRequest(req);

    if (!memberId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Please login again.",
        },
        { status: 401 }
      );
    }

    // 2. Read multipart form data

    const formData = await req.formData();

    const file = formData.get("photo");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        {
          success: false,
          error: "No image provided.",
        },
        { status: 400 }
      );
    }

    // 3. Validate image type

    const extension = ALLOWED_TYPES[file.type];

    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          error: "Only JPG, PNG and WEBP images are allowed.",
        },
        { status: 400 }
      );
    }

    // 4. Validate image size

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "Image must be greater than 0 and less than 5MB.",
        },
        { status: 400 }
      );
    }

    // 5. Convert image to buffer

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!isValidImage(buffer, file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid image file.",
        },
        { status: 400 }
      );
    }

    // 6. Verify member exists in MySQL

    const [members] = await db.execute(
      `
      SELECT id
      FROM members
      WHERE id = ?
      LIMIT 1
      `,
      [memberId]
    );

    if (!members || members.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Member not found.",
        },
        { status: 404 }
      );
    }

    // 7. Create safe member folder name

    const safeMemberId = memberId.replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );

    // 8. Create upload directory

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "profiles",
      safeMemberId
    );

    await fs.mkdir(uploadDirectory, {
      recursive: true,
    });

    // 9. Generate unique filename

    const fileName = `profile_${crypto.randomUUID()}.${extension}`;

    savedFilePath = path.join(
      uploadDirectory,
      fileName
    );

    // 10. Save image locally

    await fs.writeFile(savedFilePath, buffer, {
      flag: "wx",
    });

    // 11. Generate image URL

    const photoURL =
      `/uploads/profiles/${safeMemberId}/${fileName}`;

    // 12. Insert or update member profile

    await db.execute(
      `
      INSERT INTO member_profiles
      (
        member_id,
        photo_url,
        approved,
        approved_at,
        approved_by,
        updated_at
      )
      VALUES (?, ?, 0, NULL, NULL, CURRENT_TIMESTAMP)

      ON DUPLICATE KEY UPDATE
        photo_url = VALUES(photo_url),
        approved = 0,
        approved_at = NULL,
        approved_by = NULL,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        memberId,
        photoURL,
      ]
    );

    // 13. Success response

    return NextResponse.json(
      {
        success: true,
        memberId,
        photoURL,
        profile: {
          member_id: memberId,
          photo_url: photoURL,
          approved: false,
        },
        message: "Profile photo uploaded successfully.",
      },
      { status: 200 }
    );

  } catch (error) {

    // Remove uploaded file if database operation fails

    if (savedFilePath) {
      await fs.unlink(savedFilePath).catch(() => {});
    }

    console.error("Profile upload error:", error);

    if (error.message === "JWT_SECRET_MISSING") {
      return NextResponse.json(
        {
          success: false,
          error: "JWT_SECRET is missing or invalid.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload profile image.",
        details:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}