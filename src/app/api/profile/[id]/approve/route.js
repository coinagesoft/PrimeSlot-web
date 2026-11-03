import { NextResponse } from "next/server";
import pool from "@/lib/db";

const ALLOWED_FIELDS = [
  "headline",
  "about",
  "designation",
  "website",
  "linkedin_url",
  "address",
];

// PATCH /api/admin/profile-approvals/[id]/approve
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

    connection = await pool.getConnection();

    await connection.beginTransaction();

    // Lock the request to prevent simultaneous approval.
    const [requestRows] = await connection.execute(
      `
        SELECT id, member_id, request_text, status
        FROM profile_update_requests
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [id]
    );

    if (requestRows.length === 0) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "Profile approval request not found.",
        },
        { status: 404 }
      );
    }

    const approvalRequest = requestRows[0];

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

    // request_text must contain a JSON object.
    let submittedChanges;

    try {
      submittedChanges =
        typeof approvalRequest.request_text === "string"
          ? JSON.parse(approvalRequest.request_text)
          : approvalRequest.request_text;
    } catch {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message:
            "The submitted request is not valid JSON. No changes were applied.",
        },
        { status: 400 }
      );
    }

    if (
      !submittedChanges ||
      typeof submittedChanges !== "object" ||
      Array.isArray(submittedChanges)
    ) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "The submitted profile changes have an invalid format.",
        },
        { status: 400 }
      );
    }

    // Ignore metadata and reject unsupported profile fields.
    const submittedKeys = Object.keys(submittedChanges);

    const unsupportedFields = submittedKeys.filter(
      (field) => !ALLOWED_FIELDS.includes(field)
    );

    if (unsupportedFields.length > 0) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "The request contains unsupported profile fields.",
          fields: unsupportedFields,
        },
        { status: 400 }
      );
    }

    if (submittedKeys.length === 0) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "No profile changes were submitted.",
        },
        { status: 400 }
      );
    }

    // Validate submitted values before updating the database.
    for (const field of submittedKeys) {
      const value = submittedChanges[field];

      if (value !== null && typeof value !== "string") {
        await connection.rollback();

        return NextResponse.json(
          {
            success: false,
            message: `Invalid value for profile field: ${field}.`,
          },
          { status: 400 }
        );
      }
    }

    // Check whether the member profile already exists.
    const [profileRows] = await connection.execute(
      `
        SELECT member_id
        FROM member_profiles
        WHERE member_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [approvalRequest.member_id]
    );

    if (profileRows.length > 0) {
      // Update only submitted fields; preserve all other fields.
      const assignments = submittedKeys
        .map((field) => `\`${field}\` = ?`)
        .join(", ");

      const values = submittedKeys.map(
        (field) => submittedChanges[field]
      );

      await connection.execute(
        `
          UPDATE member_profiles
          SET ${assignments},
              approved = 1,
              approved_at = NOW(),
              approved_by = NULL
          WHERE member_id = ?
        `,
        [...values, approvalRequest.member_id]
      );
    } else {
      // Create the profile using only submitted fields.
      const columns = [
        "member_id",
        ...submittedKeys,
        "approved",
        "approved_at",
        "approved_by",
      ];

      const placeholders = columns.map(() => "?").join(", ");

      const values = [
        approvalRequest.member_id,
        ...submittedKeys.map((field) => submittedChanges[field]),
        1,
        new Date(),
        null,
      ];

      await connection.execute(
        `
          INSERT INTO member_profiles (${columns
            .map((column) => `\`${column}\``)
            .join(", ")})
          VALUES (${placeholders})
        `,
        values
      );
    }

    // Mark the request approved after applying the profile changes.
    await connection.execute(
      `
        UPDATE profile_update_requests
        SET status = 'approved',
            approved_at = NOW(),
            admin_id = NULL,
            admin_comment = NULL
        WHERE id = ?
          AND status = 'pending'
      `,
      [id]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Profile request approved successfully.",
      data: {
        id,
        member_id: approvalRequest.member_id,
        status: "approved",
        updated_fields: submittedKeys,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error(
      "PATCH /api/admin/profile-approvals/[id]/approve:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to approve the profile request.",
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}