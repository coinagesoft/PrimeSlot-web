import { NextResponse } from "next/server";
import pool from "../../../lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeStatus(value) {
  return String(value ?? "").trim().toLowerCase();
}

function formatDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function getInitials(name) {
  if (!name) return "??";

  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getMonthlyMeetingCounts(rows) {
  const now = new Date();
  const months = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );

    months.push({
      month: date.toLocaleString("en-US", {
        month: "short",
      }),
      year: date.getFullYear(),
      total: 0,
    });
  }

  const monthMap = new Map(
    months.map((item) => [
      `${item.year}-${item.month}`,
      item,
    ])
  );

  for (const row of rows) {
    const date = new Date(row.scheduledAt);

    if (Number.isNaN(date.getTime())) continue;

    const month = date.toLocaleString("en-US", {
      month: "short",
    });

    const key = `${date.getFullYear()}-${month}`;
    const entry = monthMap.get(key);

    if (entry) {
      entry.total += 1;
    }
  }

  return months;
}

export async function GET() {
  // 1. Verify the existing admin session before querying MySQL.
  const auth = await requireAdmin();

  if (!auth.authorized) {
    return NextResponse.json(
      {
        success: false,
        message: auth.message || "Authentication required.",
      },
      { status: auth.status || 401 }
    );
  }

  try {
    // 2. Fetch members from MySQL.
    const [memberRows] = await pool.query(`
      SELECT
        id,
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
        is_active,
        created_at
      FROM members
      ORDER BY created_at DESC
    `);

    // 3. Fetch events and calculate attendee counts.
    const [eventRows] = await pool.query(`
      SELECT
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.location,
        e.status,
        e.created_at,
        COALESCE(
          (
            SELECT COUNT(*)
            FROM event_members em
            WHERE em.event_id = e.id
              AND LOWER(COALESCE(em.status, 'active')) = 'active'
          ),
          0
        ) AS attendees
      FROM events e
      ORDER BY e.event_date ASC
    `);

    // 4. Fetch meetings using the existing MySQL schema.
    const [meetingRows] = await pool.query(`
      SELECT
        id,
        event_id,
        a_id,
        b_id,
        scheduled_at,
        end_time,
        duration_min,
        mode,
        place,
        topic,
        notes,
        status,
        created_at
      FROM meetings
      ORDER BY scheduled_at DESC
    `);

    // 5. Count pending profile update requests.
    const [pendingRequestRows] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM profile_update_requests
      WHERE LOWER(status) = 'pending'
    `);

    // 6. Normalize members for the existing frontend.
    const members = memberRows.map((row) => ({
      id: String(row.id),
      fullName: row.full_name || "Unknown Member",
      businessName: row.business_name || "",
      businessCategory: row.business_category || "",
      email: row.email || "",
      phone: row.phone || "",
      city: row.city || "",
      region: row.region || "",
      chapterName: row.chapter_name || "",
      memberStatus: row.member_status || "Unknown",
      trafficLight: row.traffic_light || "",
      profileImageUrl: row.profile_image_url || "",
      isActive: Boolean(row.is_active),
      initials: getInitials(row.full_name),
      createdAt: formatDate(row.created_at),
    }));

    // 7. Normalize events.
    const events = eventRows.map((row) => ({
      id: String(row.id),
      title: row.title || "Untitled Event",
      description: row.description || "",
      location: row.location || "",
      date: row.event_date,
      formattedDate: formatDate(row.event_date),
      status: row.status || "",
      attendees: Number(row.attendees || 0),
    }));

    // 8. Normalize meetings.
    const meetings = meetingRows.map((row) => ({
      id: String(row.id),
      eventId: row.event_id ? String(row.event_id) : null,
      aId: String(row.a_id),
      bId: String(row.b_id),
      topic: row.topic || "",
      status: row.status || "pending",
      scheduledAt: formatDate(row.scheduled_at),
      endTime: formatDate(row.end_time),
      durationMin: Number(row.duration_min || 30),
      mode: row.mode || "inperson",
      place: row.place || "",
      notes: row.notes || "",
      createdAt: formatDate(row.created_at),
    }));

    // 9. Calculate dashboard statistics.
    const activeMembers = members.filter(
      (member) =>
        normalizeStatus(member.memberStatus) === "active"
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingEventsList = events
      .filter((event) => {
        const eventDate = new Date(event.date);

        return (
          normalizeStatus(event.status) === "published" &&
          !Number.isNaN(eventDate.getTime()) &&
          eventDate >= today
        );
      })
      .sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      )
      .slice(0, 5);

    // 10. Recent meetings.
    const recentMeetings = [...meetings]
      .sort((a, b) => {
        const aDate = a.scheduledAt
          ? new Date(a.scheduledAt).getTime()
          : 0;

        const bDate = b.scheduledAt
          ? new Date(b.scheduledAt).getTime()
          : 0;

        return bDate - aDate;
      })
      .slice(0, 5)
      .map((meeting) => ({
        ...meeting,
        formattedScheduledAt: meeting.scheduledAt,
      }));

    // 11. Recent members.
    const recentMembers = members.slice(0, 5);

    // 12. Monthly meeting statistics.
    const monthlyMeetings = getMonthlyMeetingCounts(meetings);

    // 13. Return the existing dashboard response structure.
    return NextResponse.json({
      success: true,
      data: {
        totalMembers: members.length,
        activeMembers: activeMembers.length,
        totalMeetings: meetings.length,
        upcomingEvents: upcomingEventsList.length,
        pendingRequests: Number(
          pendingRequestRows[0]?.total || 0
        ),

        monthlyMeetings,
        recentMeetings,
        recentMembers,
        upcomingEventsList,

        members,
        events,
        meetings,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load dashboard data.",
      },
      { status: 500 }
    );
  }
}