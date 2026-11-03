import { NextResponse } from "next/server";
import pool from "@/lib/db";

// GET /api/profile-approvals?q=search&status=pending
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status")?.trim().toLowerCase() || "";

    const allowedStatuses = ["pending", "approved", "rejected"];

    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid status. Use pending, approved, or rejected.",
        },
        { status: 400 }
      );
    }

    // Get counts for the dashboard cards.
    const [countRows] = await pool.execute(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(status = 'pending'), 0) AS pending,
        COALESCE(SUM(status = 'approved'), 0) AS approved,
        COALESCE(SUM(status = 'rejected'), 0) AS rejected
      FROM profile_update_requests
    `);

    let query = `
      SELECT
        r.id,
        r.member_id,
        m.full_name,
        m.phone,
        m.email,
        m.business_name,
        m.business_category,
        m.chapter_name,
        r.request_text,
        r.status,
        r.admin_id,
        r.admin_comment,
        r.approved_at,
        r.created_at,
        r.updated_at
      FROM profile_update_requests AS r
      INNER JOIN members AS m
        ON m.id = r.member_id
    `;

    const conditions = [];
    const params = [];

    // Filter by request status.
    if (status) {
      conditions.push("r.status = ?");
      params.push(status);
    }

    // Search member and request information.
    if (search) {
      conditions.push(`
        (
          m.full_name LIKE ?
          OR m.email LIKE ?
          OR m.business_name LIKE ?
          OR m.phone LIKE ?
          OR r.request_text LIKE ?
        )
      `);

      const term = `%${search}%`;

      params.push(term, term, term, term, term);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += " ORDER BY r.created_at DESC";

    const [rows] = await pool.execute(query, params);

    const counts = countRows[0];

    return NextResponse.json({
      success: true,
      count: rows.length,
      stats: {
        total: Number(counts.total),
        pending: Number(counts.pending),
        approved: Number(counts.approved),
        rejected: Number(counts.rejected),
      },
      data: rows,
    });
  } catch (error) {
    console.error("GET /api/admin/profile-approvals:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch profile approval requests.",
      },
      { status: 500 }
    );
  }
}