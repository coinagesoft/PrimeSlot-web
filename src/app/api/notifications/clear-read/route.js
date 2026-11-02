import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function DELETE() {
  try {
    const admin = await requireAdmin();

    if (!admin.authorized) {
      return NextResponse.json(
        { success: false, message: admin.message },
        { status: admin.status || 401 }
      );
    }

    const [result] = await pool.execute(
      "DELETE FROM notifications WHERE is_read = 1"
    );

    return NextResponse.json({
      success: true,
      message: "All read notifications cleared.",
      deletedCount: result.affectedRows,
    });
  } catch (error) {
    console.error("Clear read notifications error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to clear read notifications." },
      { status: 500 }
    );
  }
}