export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import db from "@/lib/db";

function addCORS(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  return res;
}

export async function OPTIONS() {
  return addCORS(new NextResponse(null, { status: 204 }));
}

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function phoneMatches(stored, input) {
  const a = digitsOnly(stored);
  const b = digitsOnly(input);

  return a.length >= 10 &&
    b.length >= 10 &&
    a.slice(-10) === b.slice(-10);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const phone = digitsOnly(body?.phone || body?.mobile || "");

    if (phone.length < 10) {
      return addCORS(NextResponse.json(
        { ok: false, exists: false, message: "Valid phone number required" },
        { status: 400 }
      ));
    }

    const [rows] = await db.execute(`
      SELECT id, phone
      FROM members
      WHERE is_active = 1
    `);

    const member = rows.find(row => phoneMatches(row.phone, phone));

    if (!member) {
      return addCORS(NextResponse.json({
        ok: true,
        exists: false,
        message: "No registered member found"
      }));
    }

    return addCORS(NextResponse.json({
      ok: true,
      exists: true,
      message: "Registered member found"
    }));

  } catch (error) {
    console.error("check-user error:", error);

    return addCORS(NextResponse.json(
      { ok: false, exists: false, message: "Unable to check member" },
      { status: 500 }
    ));
  }
}