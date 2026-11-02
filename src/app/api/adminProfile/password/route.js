// src/app/api/profile/password/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "admin_session";

export async function PATCH(req) {
  try {
    // 1. Verify the existing admin session.
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in again." },
        { status: 401 }
      );
    }

    let decoded;

    try {
      decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
      return NextResponse.json(
        { success: false, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    // 2. Validate the request body.
    const body = await req.json();

    const currentPassword = body.current;
    const newPassword = body.newPassword;
    const confirmPassword = body.confirmPassword;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return NextResponse.json(
        { success: false, message: "All password fields are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8 || newPassword.length > 256) {
      return NextResponse.json(
        {
          success: false,
          message: "New password must contain between 8 and 256 characters.",
        },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "New password and confirmation do not match.",
        },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "New password must differ from the current password.",
        },
        { status: 400 }
      );
    }

    // 3. Fetch the Firebase user linked to the session.
    const user = await adminAuth.getUser(decoded.uid);

    if (!user.email) {
      return NextResponse.json(
        {
          success: false,
          message: "The Firebase account has no email address.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.FIREBASE_WEB_API_KEY;

    if (!apiKey) {
      console.error("FIREBASE_WEB_API_KEY is not configured.");

      return NextResponse.json(
        {
          success: false,
          message: "Password change is not configured on the server.",
        },
        { status: 500 }
      );
    }

    // 4. Verify the current password with Firebase Authentication.
    let verifyResponse;

    try {
      verifyResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            password: currentPassword,
            returnSecureToken: false,
          }),
          cache: "no-store",
        }
      );
    } catch (error) {
      console.error("Firebase password verification request failed:", error);

      return NextResponse.json(
        { success: false, message: "Unable to contact the authentication service." },
        { status: 502 }
      );
    }

    if (!verifyResponse.ok) {
      const verificationError = await verifyResponse.json().catch(() => ({}));
      const errorCode = verificationError?.error?.message;

      if (
        errorCode === "INVALID_PASSWORD" ||
        errorCode === "INVALID_LOGIN_CREDENTIALS" ||
        errorCode === "EMAIL_NOT_FOUND"
      ) {
        return NextResponse.json(
          { success: false, message: "The current password is incorrect." },
          { status: 400 }
        );
      }

      console.error("Firebase password verification failed:", errorCode);

      return NextResponse.json(
        { success: false, message: "Unable to verify the current password." },
        { status: 502 }
      );
    }

    // 5. Change the password through Firebase Admin SDK.
    await adminAuth.updateUser(decoded.uid, {
      password: newPassword,
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("PATCH /api/profile/password:", error);

    return NextResponse.json(
      { success: false, message: "Unable to change password." },
      { status: 500 }
    );
  }
}