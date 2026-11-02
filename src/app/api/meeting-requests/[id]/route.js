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

    const action = String(
      body.action || body.status || ""
    )
      .trim()
      .toLowerCase();

    const actionMap = {
      accept: "approved",
      accepted: "approved",
      approve: "approved",
      approved: "approved",

      reject: "canceled",
      rejected: "canceled",
      cancel: "canceled",
      canceled: "canceled",
      cancelled: "canceled",
    };

    const dbStatus = actionMap[action];

    if (!id || !dbStatus) {
      return NextResponse.json(
        {
          success: false,
          message: 'Provide action "accept" or "reject".',
        },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();

    const [requests] = await connection.query(
      `SELECT id, status
       FROM meetings
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    if (requests.length === 0) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "Meeting request not found.",
        },
        { status: 404 }
      );
    }

    if (requests[0].status !== "pending") {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message:
            "This meeting request has already been processed.",
        },
        { status: 409 }
      );
    }

    await connection.query(
      `UPDATE meetings
       SET status = ?,
           responded_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [dbStatus, id]
    );

    await connection.commit();

    const accepted = dbStatus === "approved";

    return NextResponse.json({
      success: true,
      message: accepted
        ? "Meeting request accepted successfully."
        : "Meeting request rejected successfully.",
      request: {
        id,
        dbStatus,
        status: accepted ? "Accepted" : "Rejected",
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Admin meeting request update error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update meeting request.",
      },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}