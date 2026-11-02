import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function POST(request) {
  try {
    const admin = await requireAdmin();

    if (!admin.authorized) {
      return NextResponse.json(
        { success: false, message: admin.message },
        { status: admin.status || 401 }
      );
    }

    const body = await request.json();
    const ids = body.ids;

    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > 500 ||
      !ids.every((id) => /^\d+$/.test(String(id)))
    ) {
      return NextResponse.json(
        { success: false, message: "Provide a valid list of notification IDs." },
        { status: 400 }
      );
    }

    const uniqueIds = [...new Set(ids.map(String))];
    const placeholders = uniqueIds.map(() => "?").join(", ");

    const [result] = await pool.execute(
      `DELETE FROM notifications WHERE id IN (${placeholders})`,
      uniqueIds
    );

    return NextResponse.json({
      success: true,
      message: "Selected notifications deleted.",
      deletedCount: result.affectedRows,
    });
  } catch (error) {
    console.error("Delete selected notifications error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete selected notifications." },
      { status: 500 }
    );
  }
}