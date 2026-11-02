import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
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

  try {
    const { searchParams } = new URL(request.url);

    const eventId = searchParams.get("eventId");
    const status = (
      searchParams.get("status") || "all"
    ).toLowerCase();

    const where = [];
    const params = [];

    if (eventId && eventId !== "all") {
      where.push("m.event_id = ?");
      params.push(eventId);
    }

    const statusMap = {
      pending: "pending",
      accepted: "approved",
      approved: "approved",
      rejected: "canceled",
      canceled: "canceled",
      cancelled: "canceled",
    };

    if (status !== "all") {
      const dbStatus = statusMap[status];

      if (!dbStatus) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid request status filter.",
          },
          { status: 400 }
        );
      }

      where.push("m.status = ?");
      params.push(dbStatus);
    }

    const whereSql = where.length
      ? `WHERE ${where.join(" AND ")}`
      : "";

    const [rows] = await pool.query(
      `SELECT
         m.id,
         m.event_id AS eventId,
         e.title AS eventTitle,

         m.a_id AS requesterId,
         requester.full_name AS requesterName,
         requester.business_name AS requesterCompany,
         requester.email AS requesterEmail,

         m.b_id AS recipientId,
         recipient.full_name AS recipientName,
         recipient.business_name AS recipientCompany,
         recipient.email AS recipientEmail,

         m.scheduled_at AS proposedAt,
         m.topic,
         m.notes,
         m.status AS dbStatus,
         m.created_at AS requestedAt,
         m.responded_at AS respondedAt

       FROM meetings m

       LEFT JOIN members requester
         ON requester.id = m.a_id

       LEFT JOIN members recipient
         ON recipient.id = m.b_id

       LEFT JOIN events e
         ON e.id = m.event_id

       ${whereSql}

       ORDER BY
         CASE WHEN m.status = 'pending' THEN 0 ELSE 1 END,
         m.created_at DESC`,
      params
    );

    const requests = rows.map((row) => ({
      id: row.id,

      eventId: row.eventId,
      eventTitle: row.eventTitle || "Unknown event",

      requesterId: row.requesterId,
      requester: {
        id: row.requesterId,
        name: row.requesterName || "Unknown member",
        company: row.requesterCompany || "",
        email: row.requesterEmail || "",
      },

      recipientId: row.recipientId,
      recipient: {
        id: row.recipientId,
        name: row.recipientName || "Unknown member",
        company: row.recipientCompany || "",
        email: row.recipientEmail || "",
      },

      proposedAt: row.proposedAt,
      message: row.notes || row.topic || "",

      dbStatus: row.dbStatus,

      status:
        row.dbStatus === "approved"
          ? "Accepted"
          : row.dbStatus === "canceled"
            ? "Rejected"
            : "Pending",

      requestedAt: row.requestedAt,
      respondedAt: row.respondedAt,
    }));

    return NextResponse.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Admin meeting requests fetch error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch meeting requests.",
      },
      { status: 500 }
    );
  }
}