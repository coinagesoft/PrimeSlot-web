import { NextResponse } from "next/server";
import pool from "@/lib/db";

const VALID_STATUSES = ["Active", "Inactive", "Pending"];

function normalizeRole(value) {
  const role = String(value ?? "Member").trim().toLowerCase();

  if (role === "member") return "Member";
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderator";

  return null;
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

async function getMember(id) {
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

  return rows[0] || null;
}

// GET /api/members/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const member = await getMember(id);

    if (!member) {
      return NextResponse.json(
        { success: false, message: "Member not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mapMember(member),
    });
  } catch (error) {
    console.error("GET /api/members/[id] error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch member." },
      { status: 500 }
    );
  }
}

// PATCH /api/members/[id]
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await getMember(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Member not found." },
        { status: 404 }
      );
    }

    const name =
      body.name === undefined
        ? existing.full_name
        : String(body.name).trim();

    const email =
      body.email === undefined
        ? existing.email
        : String(body.email).trim().toLowerCase();

    const phone =
      body.phone === undefined
        ? existing.phone
        : String(body.phone).trim();

    // Normalize account status regardless of input casing.
 const rawStatus =
  body.status === undefined
    ? existing.member_status ||
      (existing.is_active ? "Active" : "Inactive")
    : String(body.status).trim();

    const statusMap = {
      active: "Active",
      inactive: "Inactive",
      pending: "Pending",
    };

    const status = statusMap[rawStatus.toLowerCase()];

    const role =
      body.role === undefined
        ? normalizeRole(existing.role)
        : normalizeRole(body.role);

    if (!name || !email) {
      return NextResponse.json(
        {
          success: false,
          message: "Name and email are required.",
        },
        { status: 400 }
      );
    }

    // Validate email address.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid email address.",
        },
        { status: 400 }
      );
    }

    // Validate normalized status and role.
    if (!status || !VALID_STATUSES.includes(status) || !role) {
      console.error("Member validation failed:", {
        receivedStatus: body.status,
        normalizedStatus: status ?? rawStatus,
        allowedStatuses: VALID_STATUSES,
        receivedRole: body.role,
        normalizedRole: role,
        existingRole: existing.role,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Invalid role or account status.",
        },
        { status: 400 }
      );
    }

    // Do not silently claim to update a role that is not stored on members.
    if (role !== normalizeRole(existing.role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Role changes are not supported by this endpoint. Use a dedicated admin role-management flow.",
        },
        { status: 400 }
      );
    }

    await pool.execute(
      `
        UPDATE members
        SET
          full_name = ?,
          email = ?,
          phone = ?,
          member_status = ?,
          is_active = ?
        WHERE id = ?
      `,
      [
        name,
        email,
        phone || null,
        status,
        status === "Inactive" ? 0 : 1,
        id,
      ]
    );

    const updated = await getMember(id);

    return NextResponse.json({
      success: true,
      message: "Member updated successfully.",
      data: mapMember(updated),
    });
  } catch (error) {
    console.error("PATCH /api/members/[id] error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        {
          success: false,
          message: "Another member already uses this email or phone.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update member.",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/members/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const existing = await getMember(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Member not found." },
        { status: 404 }
      );
    }

    await pool.execute(
      "DELETE FROM members WHERE id = ?",
      [id]
    );

    return NextResponse.json({
      success: true,
      message: "Member deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE /api/members/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to delete member. The member may have related records.",
      },
      { status: 500 }
    );
  }
}