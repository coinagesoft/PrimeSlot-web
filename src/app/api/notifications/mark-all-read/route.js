import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function PATCH() {
  try {
    const admin = await requireAdmin();

    if (!admin.authorized) {
      return NextResponse.json(
        { success: false, message: admin.message },
        { status: admin.status || 401 }
      );
    }

    const [result] = await pool.execute(
      "UPDATE notifications SET is_read = 1 WHERE is_read = 0"
    );

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read.",
      updatedCount: result.affectedRows,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to mark notifications as read." },
      { status: 500 }
    );
  }
}