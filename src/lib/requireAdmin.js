import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function requireAdmin() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session")?.value;

    if (!sessionCookie) {
      return {
        authorized: false,
        status: 401,
        message: "Authentication required.",
      };
    }

    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    // IMPORTANT:
    // Add your existing administrator-role validation here.
    // A valid Firebase session alone does not prove that
    // the account is an authorized administrator.

    return {
      authorized: true,
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
    };
  } catch (error) {
    console.error("Admin authentication error:", error.message);

    return {
      authorized: false,
      status: 401,
      message: "Invalid or expired admin session.",
    };
  }
}