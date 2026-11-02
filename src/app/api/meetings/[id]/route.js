import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  const auth = await requireAdmin();

  if (!auth?.authorized) {
    return NextResponse.json(
      {
        success: false,
        message: auth?.message || "Authentication required.",
      },
      { status: auth?.status || 401 }
    );
  }

  let connection;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const requestedStatus = String(body.status || "")
      .trim()
      .toLowerCase();

    // These are the statuses supported by the current MySQL enum.
    const statusMap = {
      pending: "pending",
      scheduled: "approved",
      approved: "approved",
      confirmed: "approved",
      canceled: "canceled",
      cancelled: "canceled",
    };

    const dbStatus = statusMap[requestedStatus];

    if (!id || !dbStatus) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid meeting ID and status are required.",
          allowedStatuses: ["Pending", "Scheduled", "Canceled"],
        },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [meetings] = await connection.query(
      "SELECT id, status FROM meetings WHERE id = ? FOR UPDATE",
      [id]
    );

    if (meetings.length === 0) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "Meeting not found." },
        { status: 404 }
      );
    }

    await connection.query(
      `UPDATE meetings
       SET status = ?,
           responded_at = CASE
             WHEN ? = 'approved' THEN CURRENT_TIMESTAMP
             ELSE responded_at
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [dbStatus, dbStatus, id]
    );

    await connection.commit();

    const displayStatus =
      dbStatus === "approved"
        ? "Scheduled"
        : dbStatus === "canceled"
          ? "Canceled"
          : "Pending";

    return NextResponse.json({
      success: true,
      message: "Meeting status updated successfully.",
      meeting: {
        id,
        dbStatus,
        status: displayStatus,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Admin meeting status update error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update meeting status.",
      },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}