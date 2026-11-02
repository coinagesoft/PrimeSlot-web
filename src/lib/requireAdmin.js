import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebaseAdmin";
import pool from "@/lib/db";

export async function requireAdmin() {
  try {
    // 1. Read the existing Firebase session cookie.
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session")?.value;

    if (!sessionCookie) {
      return {
        authorized: false,
        status: 401,
        message: "Authentication required.",
      };
    }

    // 2. Verify the Firebase session.
    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    const uid = decodedToken.uid;
    const email = decodedToken.email?.trim().toLowerCase();

    if (!uid || !email) {
      return {
        authorized: false,
        status: 401,
        message: "Invalid admin identity.",
      };
    }

    // 3. Find the administrator in MySQL.
    const [rows] = await pool.execute(
      `
        SELECT
          firebase_uid,
          email,
          name,
          role,
          is_active
        FROM admins
        WHERE firebase_uid = ?
          AND LOWER(email) = ?
        LIMIT 1
      `,
      [uid, email]
    );

    const admin = rows[0];

    // 4. Reject accounts not registered as administrators.
    if (!admin) {
      return {
        authorized: false,
        status: 403,
        message:
          "Admin account not found in MySQL. Please register your admin profile first.",
      };
    }

    if (!Boolean(admin.is_active)) {
      return {
        authorized: false,
        status: 403,
        message: "Your administrator account is inactive.",
      };
    }

    if (String(admin.role).toLowerCase() !== "admin") {
      return {
        authorized: false,
        status: 403,
        message: "Administrator access required.",
      };
    }

    // 5. Return the authenticated MySQL administrator.
    return {
      authorized: true,
      uid: admin.firebase_uid,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
  } catch (error) {
    console.error("Admin authentication error:", error);

    return {
      authorized: false,
      status: 401,
      message: "Invalid or expired admin session.",
    };
  }
}