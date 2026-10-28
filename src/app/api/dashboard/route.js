import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export const dynamic = "force-dynamic";

/**
 * Parse values imported from Firebase.
 * Some MySQL columns contain JSON-encoded strings,
 * numbers, booleans, or objects.
 */
function parseValue(value) {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  if (!trimmed) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function parseObject(value) {
  const parsed = parseValue(value);

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed;
  }

  return {};
}

function getField(row, field) {
  if (row?.[field] !== undefined && row[field] !== null) {
    return parseValue(row[field]);
  }

  const record = parseObject(row?.record_data);

  return record[field] !== undefined
    ? parseValue(record[field])
    : null;
}

function getTimestamp(value) {
  const parsed = parseValue(value);

  if (parsed === null || parsed === undefined || parsed === "") {
    return null;
  }

  if (typeof parsed === "number" || /^\d+$/.test(String(parsed))) {
    const number = Number(parsed);

    if (!Number.isFinite(number)) return null;

    // Support Unix timestamps in seconds or milliseconds.
    return number < 100000000000
      ? number * 1000
      : number;
  }

  const timestamp = Date.parse(String(parsed));

  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatDate(value) {
  const timestamp = getTimestamp(value);

  if (timestamp === null) return null;

  return new Date(timestamp).toISOString();
}

/**
 * Normalize a direct meeting row or nested Firebase meeting.
 *
 * Direct:
 *   { firebase_key, aId, bId, status, scheduledAt, ... }
 *
 * Nested:
 *   {
 *     firebase_key: "1764084600000",
 *     record_data: {
 *       "-OeuoeGKBOqKNlFOA8TV": {
 *         aId, bId, status, topic, ...
 *       }
 *     }
 *   }
 */
function normalizeMeetings(rows) {
  const meetingsById = new Map();

  for (const row of rows) {
    const record = parseObject(row.record_data);

    const directMeeting =
      getField(row, "aId") ||
      getField(row, "bId") ||
      getField(row, "scheduledAt");

    if (directMeeting) {
      const meeting = {
        id: String(row.firebase_key),
        aId: getField(row, "aId"),
        bId: getField(row, "bId"),
        topic: getField(row, "topic"),
        status: getField(row, "status"),
        scheduledAt:
          getField(row, "scheduledAt") ??
          getField(row, "startTime") ??
          row.firebase_key,
        endTime: getField(row, "endTime"),
        eventId: getField(row, "eventId"),
        mode: getField(row, "mode"),
        place: getField(row, "place"),
        createdAt: getField(row, "createdAt"),
      };

      meetingsById.set(meeting.id, meeting);
      continue;
    }

    // Nested records: parent key -> actual meeting ID -> details.
    for (const [meetingId, detailsValue] of Object.entries(record)) {
      const details = parseObject(detailsValue);

      if (!details.aId && !details.bId) {
        continue;
      }

      const meeting = {
        id: meetingId,
        aId: parseValue(details.aId),
        bId: parseValue(details.bId),
        topic: parseValue(details.topic),
        status: parseValue(details.status),
        scheduledAt:
          parseValue(details.scheduledAt) ??
          parseValue(details.startTime) ??
          row.firebase_key,
        endTime: parseValue(details.endTime),
        eventId: parseValue(details.eventId),
        mode: parseValue(details.mode),
        place: parseValue(details.place),
        createdAt: parseValue(details.createdAt),
      };

      // Avoid counting the same meeting twice.
      if (!meetingsById.has(meeting.id)) {
        meetingsById.set(meeting.id, meeting);
      }
    }
  }

  return [...meetingsById.values()];
}

function normalizeMember(row) {
  const fullName =
    getField(row, "fullName") ||
    getField(row, "name") ||
    "Unknown Member";

  return {
    id: String(row.firebase_key),
    fullName,
    businessName: getField(row, "businessName"),
    email: getField(row, "email"),
    phone: getField(row, "phone"),
    city: getField(row, "city"),
    region: getField(row, "region"),
    chapterName: getField(row, "chapterName"),
    memberStatus: getField(row, "memberStatus") || "Unknown",
    businessCategory: getField(row, "businessCategory"),
    createdAt: getField(row, "createdAt"),
  };
}

function normalizeEvent(row, attendeeCounts = {}) {
  const date =
    getField(row, "date") ??
    getField(row, "startDate") ??
    getField(row, "scheduledAt");

  return {
    id: String(row.firebase_key),
    title: getField(row, "title") || "Untitled Event",
    location: getField(row, "location") || "",
    date,
    formattedDate: formatDate(date),
    status: getField(row, "status") || "",
    description: getField(row, "description") || "",
    attendees: attendeeCounts[String(row.firebase_key)] || 0,
  };
}

function normalizeStatus(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getMonthlyMeetingCounts(meetings, now = new Date()) {
  const months = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );

    months.push({
      month: date.toLocaleString("en-US", { month: "short" }),
      year: date.getFullYear(),
      total: 0,
    });
  }

  const monthIndex = new Map(
    months.map((item, index) => [
      `${item.year}-${item.month}`,
      index,
    ])
  );

  for (const meeting of meetings) {
    const timestamp = getTimestamp(meeting.scheduledAt);

    if (timestamp === null) continue;

    const date = new Date(timestamp);
    const key = `${date.getFullYear()}-${date.toLocaleString("en-US", {
      month: "short",
    })}`;

    const index = monthIndex.get(key);

    if (index !== undefined) {
      months[index].total += 1;
    }
  }

  return months;
}

export async function GET() {
  try {
    // Read existing tables without assuming every field is a plain string.
    const [memberResult, eventResult, meetingResult] =
      await Promise.all([
        pool.query("SELECT * FROM members"),
        pool.query("SELECT * FROM events"),
        pool.query("SELECT * FROM meetings"),
      ]);

    const memberRows = memberResult[0];
    const eventRows = eventResult[0];
    const meetingRows = meetingResult[0];

    // Event membership is optional for the dashboard attendee counts.
    let eventMemberRows = [];

    try {
      const [result] = await pool.query(
        "SELECT * FROM eventMembers"
      );

      eventMemberRows = result;
    } catch (error) {
      console.warn(
        "Could not read eventMembers:",
        error.message
      );
    }

    const members = memberRows.map(normalizeMember);
    const meetings = normalizeMeetings(meetingRows);

    const now = Date.now();

    // Count attendees from eventMembers record_data.
    // Firebase import data can contain:
    // { "undefined": true, "<eventId>": true }
    const attendeeSets = {};

    for (const row of eventMemberRows) {
      const membership = parseObject(row.record_data);

      for (const [key, value] of Object.entries(membership)) {
        if (
          key === "undefined" ||
          key === "null" ||
          !value
        ) {
          continue;
        }

        // Only count membership keys that match actual events.
        if (!eventRows.some(
          (event) => String(event.firebase_key) === key
        )) {
          continue;
        }

        attendeeSets[key] ??= new Set();
        attendeeSets[key].add(String(row.firebase_key));
      }
    }

    const attendeeCounts = Object.fromEntries(
      Object.entries(attendeeSets).map(([eventId, ids]) => [
        eventId,
        ids.size,
      ])
    );

    const events = eventRows.map((row) =>
      normalizeEvent(row, attendeeCounts)
    );

    const activeMembers = members.filter(
      (member) =>
        normalizeStatus(member.memberStatus) === "active"
    );

    const upcomingEvents = events
      .filter((event) => {
        const timestamp = getTimestamp(event.date);

        return timestamp !== null && timestamp >= now;
      })
      .sort(
        (a, b) =>
          getTimestamp(a.date) - getTimestamp(b.date)
      );

    const pendingMeetings = meetings.filter(
      (meeting) =>
        normalizeStatus(meeting.status) === "pending"
    );

    const recentMeetings = [...meetings]
      .sort((a, b) => {
        const aTime = getTimestamp(a.scheduledAt) || 0;
        const bTime = getTimestamp(b.scheduledAt) || 0;

        return bTime - aTime;
      })
      .slice(0, 5)
      .map((meeting) => ({
        ...meeting,
        formattedScheduledAt: formatDate(meeting.scheduledAt),
      }));

    const recentMembers = [...members]
      .sort((a, b) => {
        const aTime = getTimestamp(a.createdAt) || 0;
        const bTime = getTimestamp(b.createdAt) || 0;

        return bTime - aTime;
      })
      .slice(0, 5);

    const monthlyMeetings = getMonthlyMeetingCounts(meetings);

    return NextResponse.json({
      success: true,
      data: {
        totalMembers: members.length,
        activeMembers: activeMembers.length,
        totalMeetings: meetings.length,
        upcomingEvents: upcomingEvents.length,
        pendingRequests: pendingMeetings.length,

        monthlyMeetings,

        recentMeetings,
        recentMembers,
        upcomingEventsList: upcomingEvents.slice(0, 5),

        // Include normalized collections for frontend integration.
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