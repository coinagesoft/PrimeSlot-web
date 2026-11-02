import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requireAdmin();

    if (!admin.authorized) {
      return NextResponse.json(
        { success: false, message: admin.message },
        { status: admin.status || 401 }
      );
    }

    const [rows] = await pool.execute(`
      SELECT
        n.id,
        n.member_id,
        n.type,
        n.title,
        n.body,
        n.is_read,
        n.created_at,
        m.full_name AS member_name,
        sender.full_name AS sender_name
      FROM notifications n
      LEFT JOIN members m ON m.id = n.member_id
      LEFT JOIN members sender ON sender.id = n.from_member_id
      ORDER BY n.created_at DESC
      LIMIT 500
    `);

    const data = rows.map((row) => {
      const type = String(row.type || "system").toLowerCase();

      let category = "System";
      let icon = "ri-notification-3-line";
      let color = "primary";

      if (type.includes("meeting")) {
        category = "Meetings";
        icon = "ri-calendar-event-line";
        color = "info";
      } else if (type.includes("event")) {
        category = "Events";
        icon = "ri-calendar-line";
        color = "info";
      } else if (
        type.includes("member") ||
        type.includes("registration") ||
        type.includes("account")
      ) {
        category = "Members";
        icon = "ri-user-follow-line";
        color = "success";
      } else if (
        type.includes("security") ||
        type.includes("permission") ||
        type.includes("role")
      ) {
        category = "Security";
        icon = "ri-shield-user-line";
        color = "warning";
      }

      return {
        id: row.id,
        title: row.title || "Notification",
        description: row.body || "",
        time: row.created_at
          ? new Date(row.created_at).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "",
        category,
        read: Boolean(row.is_read),
        icon,
        color,
        user: row.sender_name || row.member_name || "System",
        createdAt: row.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}