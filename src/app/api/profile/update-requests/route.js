// src/app/api/profile-update-requests/route.js

import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse(data, status = 200) {
  return NextResponse.json(data, { status });
}

// GET /api/profile-update-requests
export async function GET(request) {
  try {
    // Authenticate the admin.
    const auth = await requireAdmin();

    if (!auth?.authorized) {
      return jsonResponse(
        {
          success: false,
          message: auth?.message || "Authentication required.",
        },
        auth?.status || 401
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedStatus = searchParams.get("status");

    const allowedStatuses = ["pending", "approved", "rejected"];

    if (
      requestedStatus &&
      !allowedStatuses.includes(requestedStatus.toLowerCase())
    ) {
      return jsonResponse(
        {
          success: false,
          message: "Invalid status filter.",
        },
        400
      );
    }

    let sql = `
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
        m.email
      FROM profile_update_requests r
      LEFT JOIN members m
        ON m.id = r.member_id
    `;

    const params = [];

    if (requestedStatus) {
      sql += " WHERE LOWER(r.status) = ?";
      params.push(requestedStatus.toLowerCase());
    }

    sql += " ORDER BY r.created_at DESC";

    const [rows] = await pool.execute(sql, params);

    return jsonResponse({
      success: true,
      items: rows,
      total: rows.length,
    });
  } catch (error) {
    console.error(
      "GET /api/profile-update-requests error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        message: "Failed to fetch profile update requests.",
        error: error.message,
      },
      error.status || 500
    );
  }
}