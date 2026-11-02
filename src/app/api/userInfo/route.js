import { NextResponse } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";

const VALID_STATUSES = ["Active", "Inactive", "Pending"];

function normalizeStatus(value) {
  const status = String(value ?? "Active").trim();

  if (!VALID_STATUSES.includes(status)) {
    return null;
  }

  return status;
}

function normalizeRole(value) {
  const role = String(value ?? "Member").trim().toLowerCase();

  const roles = {
    member: "Member",
    moderator: "Moderator",
    admin: "Admin",
  };

  return roles[role] ?? null;
}

function mapMember(row) {
  const role = String(row.role || "Member").toLowerCase();

  return {
    id: row.id,
    name: row.full_name,
    email: row.email || "",
    phone: row.phone || "",
    role:
      role === "admin"
        ? "Admin"
        : role === "moderator"
          ? "Moderator"
          : "Member",
    status: row.is_active
      ? row.member_status || "Active"
      : "Inactive",
    joined: row.created_at,
    avatar: String(row.full_name || "")
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  };
}

// GET /api/members?q=&role=&status=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const q = (searchParams.get("q") || "").trim();
    const roleFilter = searchParams.get("role") || "All";
    const statusFilter = searchParams.get("status") || "All";

    const conditions = [];
    const values = [];

    if (q) {
      conditions.push(`
        (
          m.full_name LIKE ?
          OR m.email LIKE ?
          OR m.phone LIKE ?
          OR m.id LIKE ?
        )
      `);

      const searchValue = `%${q}%`;

      values.push(
        searchValue,
        searchValue,
        searchValue,
        searchValue
      );
    }

    if (statusFilter !== "All") {
      if (!VALID_STATUSES.includes(statusFilter)) {
        return NextResponse.json(
          { success: false, message: "Invalid status filter." },
          { status: 400 }
        );
      }

      if (statusFilter === "Inactive") {
        conditions.push("m.is_active = 0");
      } else {
        conditions.push("m.is_active = 1");
        conditions.push("m.member_status = ?");
        values.push(statusFilter);
      }
    }

    if (roleFilter !== "All") {
      const normalizedRole = normalizeRole(roleFilter);

      if (!normalizedRole) {
        return NextResponse.json(
          { success: false, message: "Invalid role filter." },
          { status: 400 }
        );
      }

      if (normalizedRole === "Member") {
        conditions.push("a.firebase_uid IS NULL");
      } else {
        conditions.push("LOWER(a.role) = ?");
        values.push(normalizedRole.toLowerCase());
      }
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [rows] = await pool.execute(
      `
        SELECT
          m.id,
          m.full_name,
          m.email,
          m.phone,
          m.member_status,
          m.is_active,
          m.created_at,
          a.role
        FROM members m
        LEFT JOIN admins a
          ON a.firebase_uid = m.firebase_uid
          AND a.is_active = 1
        ${whereClause}
        ORDER BY m.created_at DESC
      `,
      values
    );

    // Overall statistics, independent of current filters.
    const [statRows] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN m.is_active = 1 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN m.is_active = 0 THEN 1 ELSE 0 END) AS inactive,
        SUM(
          CASE
            WHEN LOWER(a.role) = 'admin' THEN 1
            ELSE 0
          END
        ) AS admins
      FROM members m
      LEFT JOIN admins a
        ON a.firebase_uid = m.firebase_uid
        AND a.is_active = 1
    `);

    const statsRow = statRows[0] || {};

    return NextResponse.json({
      success: true,
      count: rows.length,
      stats: {
        total: Number(statsRow.total || 0),
        active: Number(statsRow.active || 0),
        inactive: Number(statsRow.inactive || 0),
        admins: Number(statsRow.admins || 0),
      },
      data: rows.map(mapMember),
    });
  } catch (error) {
    console.error("GET /api/members error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch members.",
      },
      { status: 500 }
    );
  }
}

// POST /api/members
export async function POST(request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();

    const requestedRole = normalizeRole(body.role);
    const status = normalizeStatus(body.status);

    if (!name || !email) {
      return NextResponse.json(
        {
          success: false,
          message: "Name and email are required.",
        },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (!requestedRole || !status) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid role or account status.",
        },
        { status: 400 }
      );
    }

    // Role management needs a separate trusted admin identity.
    // This endpoint only creates ordinary members.
    if (requestedRole !== "Member") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Creating Admin or Moderator accounts requires a separate role-management flow.",
        },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID().replaceAll("-", "");

    await pool.execute(
      `
        INSERT INTO members (
          id,
          full_name,
          email,
          phone,
          member_status,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        name,
        email,
        phone || null,
        status,
        status === "Inactive" ? 0 : 1,
      ]
    );

    const [rows] = await pool.execute(
      `
        SELECT
          m.id,
          m.full_name,
          m.email,
          m.phone,
          m.member_status,
          m.is_active,
          m.created_at,
          a.role
        FROM members m
        LEFT JOIN admins a
          ON a.firebase_uid = m.firebase_uid
          AND a.is_active = 1
        WHERE m.id = ?
        LIMIT 1
      `,
      [id]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Member created successfully.",
        data: mapMember(rows[0]),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/members error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        {
          success: false,
          message: "A member with this email or phone already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create member.",
      },
      { status: 500 }
    );
  }
}