// src/app/api/profile/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebaseAdmin";
import db from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "admin_session";

const PROFILE_FIELDS = [
  "fullName",
  "email",
  "phone",
  "designation",
  "department",
  "timezone",
  "bio",
  "businessName",
  "businessCategory",
  "chapterName",
  "region",
  "city",
  "memberStatus",
  "photoURL",
];

// --------------------------------------------------
// GET ADMIN UID FROM SESSION COOKIE
// --------------------------------------------------

async function getAdminUid() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    return decoded.uid;
  } catch {
    return null;
  }
}

// --------------------------------------------------
// STANDARD JSON RESPONSES
// --------------------------------------------------

function errorResponse(message, status) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

// --------------------------------------------------
// VALIDATE PROFILE
// --------------------------------------------------

function validateProfile(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Invalid profile data." };
  }

  const fullName =
    typeof body.fullName === "string"
      ? body.fullName.trim()
      : "";

  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const phone =
    typeof body.phone === "string"
      ? body.phone.trim()
      : "";

  if (!fullName || !email || !phone) {
    return {
      error: "Full name, email and phone are required.",
    };
  }

  if (
    fullName.length > 150 ||
    email.length > 254 ||
    phone.length > 30
  ) {
    return {
      error: "A profile field exceeds its maximum length.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      error: "Please enter a valid email address.",
    };
  }

  const timezone =
    typeof body.timezone === "string" && body.timezone.trim()
      ? body.timezone.trim()
      : "Asia/Kolkata";

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
    });
  } catch {
    return {
      error: "Please enter a valid timezone.",
    };
  }

  const stringField = (key, maxLength = 255) => {
    const value =
      typeof body[key] === "string"
        ? body[key].trim()
        : "";

    return value.slice(0, maxLength);
  };

  return {
    data: {
      fullName,
      email,
      phone,
      designation: stringField("designation", 100),
      department: stringField("department", 100),
      timezone,
      bio: stringField("bio", 10000),
      businessName: stringField("businessName"),
      businessCategory: stringField("businessCategory", 150),
      chapterName: stringField("chapterName", 150),
      region: stringField("region", 150),
      city: stringField("city", 150),
      memberStatus: stringField("memberStatus", 50),
      photoURL: stringField("photoURL", 2000),
    },
  };
}

// --------------------------------------------------
// LOAD PROFILE FROM MYSQL
// --------------------------------------------------

async function loadProfile(uid) {
  const [rows] = await db.execute(
    `SELECT
       firebase_uid,
       name,
       email,
       role,
       is_active,
       created_at,
       updated_at,
       phone,
       designation,
       department,
       timezone,
       bio,
       business_name,
       business_category,
       chapter_name,
       region,
       city,
       member_status,
       photo_url
     FROM admins
     WHERE firebase_uid = ?
     LIMIT 1`,
    [uid]
  );

  if (rows.length === 0) {
    return null;
  }

  const admin = rows[0];

  return {
    fullName: admin.name || "",
    email: admin.email || "",
    phone: admin.phone || "",
    designation: admin.designation || "",
    department: admin.department || "",
    timezone: admin.timezone || "Asia/Kolkata",
    bio: admin.bio || "",
    businessName: admin.business_name || "",
    businessCategory: admin.business_category || "",
    chapterName: admin.chapter_name || "",
    region: admin.region || "",
    city: admin.city || "",
    memberStatus: admin.member_status || "",
    photoURL: admin.photo_url || "",

    role: admin.role || "",
    isActive:
      admin.is_active === true ||
      admin.is_active === 1,

    createdAt: admin.created_at || null,
    updatedAt: admin.updated_at || null,
  };
}

// --------------------------------------------------
// CHECK ADMIN EXISTS AND IS ACTIVE
// --------------------------------------------------

async function checkAdmin(uid) {
  const [rows] = await db.execute(
    `SELECT firebase_uid, is_active
     FROM admins
     WHERE firebase_uid = ?
     LIMIT 1`,
    [uid]
  );

  if (rows.length === 0) {
    return {
      error: "Admin account not found in MySQL.",
      status: 404,
    };
  }

  const isActive =
    rows[0].is_active === true ||
    rows[0].is_active === 1;

  if (!isActive) {
    return {
      error: "This admin account is inactive.",
      status: 403,
    };
  }

  return { admin: rows[0] };
}

// --------------------------------------------------
// SAVE PROFILE TO EXISTING ADMINS TABLE
// --------------------------------------------------

async function saveProfile(uid, profile) {
  let connection;

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();

    // Lock the current admin row.
    const [admins] = await connection.execute(
      `SELECT firebase_uid, is_active
       FROM admins
       WHERE firebase_uid = ?
       LIMIT 1
       FOR UPDATE`,
      [uid]
    );

    if (admins.length === 0) {
      await connection.rollback();

      return {
        error: "Admin account not found in MySQL.",
        status: 404,
      };
    }

    const isActive =
      admins[0].is_active === true ||
      admins[0].is_active === 1;

    if (!isActive) {
      await connection.rollback();

      return {
        error: "This admin account is inactive.",
        status: 403,
      };
    }

    // Prevent another admin record from using this email.
    const [emailOwners] = await connection.execute(
      `SELECT firebase_uid
       FROM admins
       WHERE email = ?
         AND firebase_uid <> ?
       LIMIT 1`,
      [profile.email, uid]
    );

    if (emailOwners.length > 0) {
      await connection.rollback();

      return {
        error: "This email is already in use.",
        status: 409,
      };
    }

    await connection.execute(
      `UPDATE admins
       SET
         name = ?,
         email = ?,
         phone = ?,
         designation = ?,
         department = ?,
         timezone = ?,
         bio = ?,
         business_name = ?,
         business_category = ?,
         chapter_name = ?,
         region = ?,
         city = ?,
         member_status = ?,
         photo_url = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE firebase_uid = ?`,
      [
        profile.fullName,
        profile.email,
        profile.phone,
        profile.designation,
        profile.department,
        profile.timezone,
        profile.bio,
        profile.businessName,
        profile.businessCategory,
        profile.chapterName,
        profile.region,
        profile.city,
        profile.memberStatus,
        profile.photoURL,
        uid,
      ]
    );

    await connection.commit();

    return {
      success: true,
    };
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    // Log the actual error on the server, not in the API response.
    console.error("saveProfile:", error);

    throw error;
  } finally {
    connection?.release();
  }
}

// --------------------------------------------------
// GET /api/profile
// Fetch logged-in admin's profile
// --------------------------------------------------

export async function GET() {
  try {
    const uid = await getAdminUid();

    if (!uid) {
      return errorResponse(
        "Unauthorized. Please log in again.",
        401
      );
    }

    const profile = await loadProfile(uid);

    if (!profile) {
      return errorResponse(
        "Admin account not found in MySQL.",
        404
      );
    }

    if (!profile.isActive) {
      return errorResponse(
        "This admin account is inactive.",
        403
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("GET /api/profile:", error);

    return errorResponse(
      "Unable to fetch profile.",
      500
    );
  }
}

// --------------------------------------------------
// PUT /api/profile
// Replace/update the complete profile
// --------------------------------------------------

export async function PUT(req) {
  try {
    const uid = await getAdminUid();

    if (!uid) {
      return errorResponse(
        "Unauthorized. Please log in again.",
        401
      );
    }

    let body;

    try {
      body = await req.json();
    } catch {
      return errorResponse(
        "Invalid JSON request body.",
        400
      );
    }

    const validation = validateProfile(body);

    if (validation.error) {
      return errorResponse(
        validation.error,
        400
      );
    }

    const result = await saveProfile(
      uid,
      validation.data
    );

    if (result.error) {
      return errorResponse(
        result.error,
        result.status
      );
    }

    const updatedProfile = await loadProfile(uid);

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("PUT /api/profile:", error);

    return errorResponse(
      "Unable to update profile.",
      500
    );
  }
}

// --------------------------------------------------
// PATCH /api/profile
// Update only the supplied profile fields
// --------------------------------------------------

export async function PATCH(req) {
  try {
    const uid = await getAdminUid();

    if (!uid) {
      return errorResponse(
        "Unauthorized. Please log in again.",
        401
      );
    }

    let body;

    try {
      body = await req.json();
    } catch {
      return errorResponse(
        "Invalid JSON request body.",
        400
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorResponse(
        "Invalid profile data.",
        400
      );
    }

    // Do not allow unexpected fields to be updated.
    const suppliedFields = Object.keys(body);

    if (suppliedFields.length === 0) {
      return errorResponse(
        "Provide at least one profile field to update.",
        400
      );
    }

    const invalidFields = suppliedFields.filter(
      (field) => !PROFILE_FIELDS.includes(field)
    );

    if (invalidFields.length > 0) {
      return errorResponse(
        `Unsupported profile field(s): ${invalidFields.join(", ")}`,
        400
      );
    }

    const adminCheck = await checkAdmin(uid);

    if (adminCheck.error) {
      return errorResponse(
        adminCheck.error,
        adminCheck.status
      );
    }

    // Merge submitted fields with existing profile data.
    // This prevents omitted fields from being erased.
    const currentProfile = await loadProfile(uid);

    if (!currentProfile) {
      return errorResponse(
        "Admin account not found in MySQL.",
        404
      );
    }

    const mergedProfile = {
      ...currentProfile,
      ...body,
    };

    const validation = validateProfile(mergedProfile);

    if (validation.error) {
      return errorResponse(
        validation.error,
        400
      );
    }

    const result = await saveProfile(
      uid,
      validation.data
    );

    if (result.error) {
      return errorResponse(
        result.error,
        result.status
      );
    }

    const updatedProfile = await loadProfile(uid);

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("PATCH /api/profile:", error);

    return errorResponse(
      "Unable to update profile.",
      500
    );
  }
}

// --------------------------------------------------
// POST /api/profile
// Initialize/update profile for an existing admin
// --------------------------------------------------

export async function POST(req) {
  try {
    const uid = await getAdminUid();

    if (!uid) {
      return errorResponse(
        "Unauthorized. Please log in again.",
        401
      );
    }

    // Only an existing admin can initialize their profile.
    // This endpoint never inserts a new admins row.
    const adminCheck = await checkAdmin(uid);

    if (adminCheck.error) {
      return errorResponse(
        adminCheck.error,
        adminCheck.status
      );
    }

    let body;

    try {
      body = await req.json();
    } catch {
      return errorResponse(
        "Invalid JSON request body.",
        400
      );
    }

    const validation = validateProfile(body);

    if (validation.error) {
      return errorResponse(
        validation.error,
        400
      );
    }

    const result = await saveProfile(
      uid,
      validation.data
    );

    if (result.error) {
      return errorResponse(
        result.error,
        result.status
      );
    }

    const profile = await loadProfile(uid);

    return NextResponse.json(
      {
        success: true,
        message: "Profile initialized successfully.",
        profile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/profile:", error);

    return errorResponse(
      "Unable to initialize profile.",
      500
    );
  }
}