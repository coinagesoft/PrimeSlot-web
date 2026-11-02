import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q")?.trim() || "";

    let query = `
      SELECT
        member_id,
        full_name,
        phone,
        email,
        business_name,
        business_category,
        chapter_name,
        region,
        city,
        member_status,
        traffic_light,
        profile_image_url,
        notes,
        is_active,
        created_at,
        updated_at
      FROM members
    `;

    const params = [];

    if (search) {
      query += `
        WHERE full_name LIKE ?
           OR email LIKE ?
           OR phone LIKE ?
           OR business_name LIKE ?
      `;

      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += " ORDER BY member_id DESC";

    const [rows] = await pool.execute(query, params);

    return NextResponse.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("GET /api/members:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch members." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      full_name,
      phone,
      email,
      business_name,
      business_category,
      chapter_name,
      region,
      city,
      member_status,
      traffic_light,
      profile_image_url,
      notes,
    } = body;

    if (!full_name?.trim()) {
      return NextResponse.json(
        { success: false, message: "Full name is required." },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `INSERT INTO members (
        full_name,
        phone,
        email,
        business_name,
        business_category,
        chapter_name,
        region,
        city,
        member_status,
        traffic_light,
        profile_image_url,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name.trim(),
        phone || null,
        email?.trim().toLowerCase() || null,
        business_name || null,
        business_category || null,
        chapter_name || null,
        region || null,
        city || null,
        member_status || null,
        traffic_light || null,
        profile_image_url || null,
        notes || null,
      ]
    );

    const [rows] = await pool.execute(
      "SELECT * FROM members WHERE member_id = ?",
      [result.insertId]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Member created successfully.",
        data: rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/members:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        {
          success: false,
          message: "This phone number or email already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create member." },
      { status: 500 }
    );
  }
}