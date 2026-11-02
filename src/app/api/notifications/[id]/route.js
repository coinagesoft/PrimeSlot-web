import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function PATCH(request, { params }) {
  try {
    const admin = await requireAdmin();

    if (!admin.authorized) {
      return NextResponse.json(
        { success: false, message: admin.message },
        { status: admin.status || 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    if (!/^\d+$/.test(String(id))) {
      return NextResponse.json(
        { success: false, message: "Invalid notification ID." },
        { status: 400 }
      );
    }

    if (typeof body.read !== "boolean") {
      return NextResponse.json(
        { success: false, message: "The read field must be true or false." },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      "UPDATE notifications SET is_read = ? WHERE id = ?",
      [body.read ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        "SELECT id FROM notifications WHERE id = ? LIMIT 1",
        [id]
      );

      if (existing.length === 0) {
        return NextResponse.json(
          { success: false, message: "Notification not found." },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: body.read
        ? "Notification marked as read."
        : "Notification marked as unread.",
    });
  } catch (error) {
    console.error("PATCH /api/notifications/[id] error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update notification." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const admin = await requireAdmin();

    if (!admin.authorized) {
      return NextResponse.json(
        { success: false, message: admin.message },
        { status: admin.status || 401 }
      );
    }

    const { id } = await params;

    if (!/^\d+$/.test(String(id))) {
      return NextResponse.json(
        { success: false, message: "Invalid notification ID." },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      "DELETE FROM notifications WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Notification not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification deleted.",
    });
  } catch (error) {
    console.error("DELETE /api/notifications/[id] error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete notification." },
      { status: 500 }
    );
  }
}