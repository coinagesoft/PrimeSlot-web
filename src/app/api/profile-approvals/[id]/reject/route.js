import { NextResponse } from "next/server";
import pool from "@/lib/db";

// PATCH /api/admin/profile-approvals/[id]/reject
export async function PATCH(request, { params }) {
  let connection;

  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "A valid request ID is required.",
        },
        { status: 400 }
      );
    }

    // Read the rejection reason from the request body.
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "A valid JSON request body is required.",
        },
        { status: 400 }
      );
    }

    const reason = body.reason?.trim();

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a rejection reason.",
        },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();

    // Lock the request to prevent concurrent review operations.
    const [rows] = await connection.execute(
      `
        SELECT id, member_id, status
        FROM profile_update_requests
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [id]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "Profile approval request not found.",
        },
        { status: 404 }
      );
    }

    const approvalRequest = rows[0];

    if (approvalRequest.status !== "pending") {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: `This request has already been ${approvalRequest.status}.`,
        },
        { status: 409 }
      );
    }

    // Mark the request as rejected.
    // The member's profile is not modified.
    const [result] = await connection.execute(
      `
        UPDATE profile_update_requests
        SET status = 'rejected',
            admin_comment = ?,
            admin_id = NULL,
            approved_at = NOW()
        WHERE id = ?
          AND status = 'pending'
      `,
      [reason, id]
    );

    if (result.affectedRows !== 1) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "The request could not be rejected.",
        },
        { status: 409 }
      );
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Profile update request rejected successfully.",
      data: {
        id: approvalRequest.id,
        member_id: approvalRequest.member_id,
        status: "rejected",
        admin_comment: reason,
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    console.error(
      "PATCH /api/admin/profile-approvals/[id]/reject:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to reject the profile update request.",
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}