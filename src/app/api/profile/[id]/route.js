import { NextResponse } from "next/server";
import pool from "@/lib/db";

// GET /api/admin/profile-approvals/[id]
export async function GET(request, { params }) {
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

    // Fetch the selected request and member information.
    const [requestRows] = await pool.execute(
      `
        SELECT
          r.id,
          r.member_id,
          r.request_text,
          r.status,
          r.admin_id,
          r.admin_comment,
          r.approved_at,
          r.created_at,
          r.updated_at,

          m.full_name,
          m.phone,
          m.email,
          m.business_name,
          m.business_category,
          m.chapter_name,
          m.region,
          m.city,
          m.member_status,
          m.profile_image_url,

          p.headline,
          p.about,
          p.designation,
          p.website,
          p.linkedin_url,
          p.address,
          p.approved AS profile_approved,
          p.approved_at AS profile_approved_at,
          p.approved_by AS profile_approved_by

        FROM profile_update_requests AS r

        INNER JOIN members AS m
          ON m.id = r.member_id

        LEFT JOIN member_profiles AS p
          ON p.member_id = r.member_id

        WHERE r.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (requestRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Profile approval request not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: requestRows[0],
    });
  } catch (error) {
    console.error(
      "GET /api/admin/profile-approvals/[id]:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch profile approval request.",
      },
      { status: 500 }
    );
  }
}