
"use client";

import React, { useMemo, useState } from "react";

const DEMO_EVENTS = [
  { id: "evt-1", title: "PrimeSlot Business Connect" },
  { id: "evt-2", title: "Founders Networking Meetup" },
  { id: "evt-3", title: "Industry Leaders Roundtable" },
  { id: "evt-4", title: "Monthly Member Mixer" },
];

const DEMO_MEMBERS = {
  m1: {
    id: "m1",
    name: "Aarav Mehta",
    company: "Mehta Advisory",
    initials: "AM",
    color: "primary",
  },
  m2: {
    id: "m2",
    name: "Priya Shah",
    company: "Shah Ventures",
    initials: "PS",
    color: "success",
  },
  m3: {
    id: "m3",
    name: "Rohan Kulkarni",
    company: "RK Digital",
    initials: "RK",
    color: "info",
  },
  m4: {
    id: "m4",
    name: "Neha Desai",
    company: "Desai Finance",
    initials: "ND",
    color: "warning",
  },
  m5: {
    id: "m5",
    name: "Karan Patel",
    company: "KP Solutions",
    initials: "KP",
    color: "danger",
  },
};

const DEMO_MEETINGS = [
  {
    id: "mt-1",
    eventId: "evt-1",
    aId: "m1",
    bId: "m2",
    scheduledAt: "2026-10-21T11:30:00",
    outcome: "Discussed a potential business partnership and future collaboration.",
    businessGivenByA: 3,
    businessGivenByB: 2,
    status: "Completed",
  },
  {
    id: "mt-2",
    eventId: "evt-1",
    aId: "m3",
    bId: "m4",
    scheduledAt: "2026-10-21T14:00:00",
    outcome: "Initial discussion about a new digital transformation project.",
    businessGivenByA: 1,
    businessGivenByB: 4,
    status: "Scheduled",
  },
  {
    id: "mt-3",
    eventId: "evt-1",
    aId: "m2",
    bId: "m5",
    scheduledAt: "2026-10-22T10:00:00",
    outcome: "Exploring opportunities for business referrals.",
    businessGivenByA: 2,
    businessGivenByB: 1,
    status: "Scheduled",
  },
  {
    id: "mt-4",
    eventId: "evt-2",
    aId: "m1",
    bId: "m3",
    scheduledAt: "2026-10-23T16:00:00",
    outcome: "Shared industry insights and potential client introductions.",
    businessGivenByA: 5,
    businessGivenByB: 2,
    status: "Completed",
  },
  {
    id: "mt-5",
    eventId: "evt-2",
    aId: "m4",
    bId: "m5",
    scheduledAt: "2026-10-24T12:00:00",
    outcome: "Meeting rescheduled; awaiting confirmation of the next date.",
    businessGivenByA: 0,
    businessGivenByB: 0,
    status: "Canceled",
  },
  {
    id: "mt-6",
    eventId: "evt-3",
    aId: "m2",
    bId: "m3",
    scheduledAt: "2026-11-04T15:00:00",
    outcome: "Discussing a possible strategic partnership.",
    businessGivenByA: 1,
    businessGivenByB: 3,
    status: "Scheduled",
  },
  {
    id: "mt-7",
    eventId: "evt-4",
    aId: "m1",
    bId: "m4",
    scheduledAt: "2026-11-12T11:00:00",
    outcome: "Follow-up meeting to discuss shared business opportunities.",
    businessGivenByA: 2,
    businessGivenByB: 2,
    status: "Scheduled",
  },
];

const DEMO_MEETING_REQUESTS = [
  {
    id: "req-1",
    eventId: "evt-1",
    requesterId: "m2",
    recipientId: "m1",
    proposedAt: "2026-10-22T12:30:00",
    message: "I'd like to discuss a possible business collaboration.",
    status: "Pending",
    requestedAt: "2026-10-20T10:15:00",
  },
  {
    id: "req-2",
    eventId: "evt-2",
    requesterId: "m3",
    recipientId: "m4",
    proposedAt: "2026-10-24T15:00:00",
    message: "Can we connect about digital marketing opportunities?",
    status: "Pending",
    requestedAt: "2026-10-20T13:40:00",
  },
  {
    id: "req-3",
    eventId: "evt-3",
    requesterId: "m5",
    recipientId: "m2",
    proposedAt: "2026-10-25T11:00:00",
    message: "I would like to explore referral opportunities.",
    status: "Accepted",
    requestedAt: "2026-10-18T09:30:00",
  },
];

function formatDateTime(value) {
  if (!value) return "Date not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date not set";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClass(status) {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "bg-label-success";
    case "scheduled":
    case "confirmed":
      return "bg-label-info";
    case "canceled":
    case "cancelled":
      return "bg-label-danger";
    case "pending":
      return "bg-label-warning";
    default:
      return "bg-label-secondary";
  }
}

function MemberAvatar({ member, size = 34 }) {
  if (!member) {
    return (
      <div
        className="avatar"
        title="Unknown member"
        style={{ width: size, height: size }}
      >
        <span
          className="avatar-initial rounded-circle bg-label-secondary"
          style={{ fontSize: 11 }}
        >
          ?
        </span>
      </div>
    );
  }

  return (
    <div
      className="avatar"
      title={`${member.name}${member.company ? ` — ${member.company}` : ""}`}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <span
        className={`avatar-initial rounded-circle bg-label-${member.color || "primary"}`}
        style={{
          width: size,
          height: size,
          fontSize: size <= 34 ? 11 : 13,
          fontWeight: 600,
        }}
      >
        {member.initials ||
          member.name
            ?.split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
      </span>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }) {
  return (
    <div className="col-6 col-xl-3">
      <div className="card h-100">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
            <div className={`avatar bg-label-${color}`}>
              <span className="avatar-initial rounded">
                <i className={`${icon} fs-4`} />
              </span>
            </div>
          </div>
          <h4 className="mb-1">{value}</h4>
          <p className="mb-1">{title}</p>
          <small className="text-muted">{subtitle}</small>
        </div>
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  // Demo data only. API integration will be added later.
  const [events] = useState(DEMO_EVENTS);
  const [members] = useState(DEMO_MEMBERS);
  const [meetings, setMeetings] = useState(DEMO_MEETINGS);
  const [meetingRequests, setMeetingRequests] = useState(DEMO_MEETING_REQUESTS);

  const [selectedEventId, setSelectedEventId] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [notice, setNotice] = useState("");

  const filteredMeetings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return meetings
      .filter((meeting) => {
        const memberA = members[meeting.aId];
        const memberB = members[meeting.bId];

        const matchesEvent =
          selectedEventId === "all" ||
          meeting.eventId === selectedEventId;

        const matchesSearch =
          !normalizedSearch ||
          [
            memberA?.name,
            memberA?.company,
            memberB?.name,
            memberB?.company,
            meeting.outcome,
            events.find((event) => event.id === meeting.eventId)?.title,
          ]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch));

        const matchesStatus =
          statusFilter === "all" ||
          meeting.status?.toLowerCase() === statusFilter;

        const meetingDate = meeting.scheduledAt
          ? new Date(meeting.scheduledAt)
          : null;

        let matchesDate = true;

        if (dateFilter === "upcoming") {
          matchesDate =
            meetingDate !== null &&
            !Number.isNaN(meetingDate.getTime()) &&
            meetingDate >= today;
        }

        if (dateFilter === "past") {
          matchesDate =
            meetingDate !== null &&
            !Number.isNaN(meetingDate.getTime()) &&
            meetingDate < today;
        }

        return (
          matchesEvent && matchesSearch && matchesStatus && matchesDate
        );
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() -
          new Date(b.scheduledAt).getTime()
      );
  }, [
    meetings,
    members,
    events,
    selectedEventId,
    search,
    statusFilter,
    dateFilter,
  ]);

  const stats = useMemo(() => {
    const relevantMeetings =
      selectedEventId === "all"
        ? meetings
        : meetings.filter((meeting) => meeting.eventId === selectedEventId);

    return {
      total: relevantMeetings.length,
      completed: relevantMeetings.filter(
        (meeting) => meeting.status?.toLowerCase() === "completed"
      ).length,
      scheduled: relevantMeetings.filter((meeting) =>
        ["scheduled", "confirmed"].includes(meeting.status?.toLowerCase())
      ).length,
      canceled: relevantMeetings.filter((meeting) =>
        ["canceled", "cancelled"].includes(meeting.status?.toLowerCase())
      ).length,
      referencesGiven: relevantMeetings.reduce(
        (sum, meeting) => sum + (Number(meeting.businessGivenByA) || 0),
        0
      ),
      referralsReceived: relevantMeetings.reduce(
        (sum, meeting) => sum + (Number(meeting.businessGivenByB) || 0),
        0
      ),
    };
  }, [meetings, selectedEventId]);

  const clearFilters = () => {
    setSearch("");
    setSelectedEventId("all");
    setStatusFilter("all");
    setDateFilter("all");
  };

  const updateMeetingStatus = (meetingId, status) => {
    setMeetings((previous) =>
      previous.map((meeting) =>
        meeting.id === meetingId ? { ...meeting, status } : meeting
      )
    );

    setSelectedMeeting((previous) =>
      previous?.id === meetingId ? { ...previous, status } : previous
    );

    setNotice(`Meeting status changed to ${status}.`);
  };

  const updateRequestStatus = (requestId, status) => {
    setMeetingRequests((previous) =>
      previous.map((request) =>
        request.id === requestId ? { ...request, status } : request
      )
    );
    setNotice(`Meeting request ${status.toLowerCase()}.`);
  };

  const selectedEvent =
    selectedEventId === "all"
      ? null
      : events.find((event) => event.id === selectedEventId);

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1 ">
            Meetings
          </h4>
          <p className="text-muted mb-0">
            Track one-to-one meetings, member connections, and business
            referrals.
          </p>
        </div>
        

        <div style={{ minWidth: 240, maxWidth: 380, width: "100%" }}>
          <label htmlFor="eventFilter" className="form-label small mb-1">
            Filter by event
          </label>
          <select
            id="eventFilter"
            className="form-select"
            value={selectedEventId}
            onChange={(event) => setSelectedEventId(event.target.value)}
          >
            <option value="all">All events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {notice && (
        <div className="alert alert-success d-flex align-items-center mb-4">
          <i className="ri-checkbox-circle-line fs-5 me-2" />
          <span>{notice}</span>
          <button
            type="button"
            className="btn-close ms-auto"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          />
        </div>
      )}

      <div className="row g-4 mb-4">
        <StatCard
          title="Total meetings"
          value={stats.total}
          subtitle="For the selected event"
          icon="ri-calendar-event-line"
          color="primary"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          subtitle="Successfully completed"
          icon="ri-checkbox-circle-line"
          color="success"
        />
        <StatCard
          title="Scheduled"
          value={stats.scheduled}
          subtitle="Upcoming or confirmed"
          icon="ri-time-line"
          color="info"
        />
        <StatCard
          title="Canceled"
          value={stats.canceled}
          subtitle="Canceled meetings"
          icon="ri-calendar-close-line"
          color="danger"
        />
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-6">
          <div className="card h-100">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="avatar bg-label-primary">
                <span className="avatar-initial rounded">
                  <i className="ri-share-forward-line fs-4" />
                </span>
              </div>
              <div>
                <p className="text-muted mb-1">Business given by attendee A</p>
                <h4 className="mb-0">{stats.referencesGiven}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card h-100">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="avatar bg-label-success">
                <span className="avatar-initial rounded">
                  <i className="ri-hand-coin-line fs-4" />
                </span>
              </div>
              <div>
                <p className="text-muted mb-1">
                  Business given by attendee B
                </p>
                <h4 className="mb-0">{stats.referralsReceived}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-lg-5">
              <label htmlFor="meetingSearch" className="form-label">
                Search meetings
              </label>
              <div className="input-group input-group-merge">
                <span className="input-group-text">
                  <i className="ri-search-line" />
                </span>
                <input
                  id="meetingSearch"
                  type="search"
                  className="form-control"
                  placeholder="Member, company, event, or outcome..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="col-6 col-lg-2">
              <label htmlFor="statusFilter" className="form-label">
                Status
              </label>
              <select
                id="statusFilter"
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>

            <div className="col-6 col-lg-3">
              <label htmlFor="dateFilter" className="form-label">
                Meeting date
              </label>
              <select
                id="dateFilter"
                className="form-select"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              >
                <option value="all">All dates</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>

            <div className="col-12 col-lg-2">
              <button
                type="button"
                className="btn btn-outline-primary w-100"
                onClick={clearFilters}
              >
                <i className="ri-refresh-line me-1" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
          <div>
            <h5 className="mb-1">Meeting Requests</h5>
            <small className="text-muted">
              Review requests from members and accept or reject pending meetings.
            </small>
          </div>
          <span className="badge bg-label-warning align-self-start align-self-sm-center">
            {meetingRequests.filter((request) => request.status === "Pending").length} pending
          </span>
        </div>

        {meetingRequests.filter((request) =>
          selectedEventId === "all" || request.eventId === selectedEventId
        ).length === 0 ? (
          <div className="card-body text-center py-4">
            <i className="ri-calendar-check-line fs-1 text-muted mb-2" />
            <h6 className="mb-1">No meeting requests</h6>
            <p className="text-muted mb-0">There are no requests for this event.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ minWidth: 210 }}>Requested by</th>
                  <th style={{ minWidth: 190 }}>Meeting with</th>
                  <th style={{ minWidth: 190 }}>Event</th>
                  <th style={{ minWidth: 165 }}>Proposed date &amp; time</th>
                  <th style={{ minWidth: 220 }}>Message</th>
                  <th>Status</th>
                  <th className="text-end" style={{ minWidth: 170 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {meetingRequests
                  .filter((request) =>
                    selectedEventId === "all" || request.eventId === selectedEventId
                  )
                  .map((request) => {
                    const requester = members[request.requesterId];
                    const recipient = members[request.recipientId];
                    const eventTitle = events.find((event) => event.id === request.eventId)?.title || "Unknown event";
                    const isPending = request.status === "Pending";

                    return (
                      <tr key={request.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <MemberAvatar member={requester} size={36} />
                            <div>
                              <div className="fw-medium">{requester?.name || "Unknown member"}</div>
                              <small className="text-muted">{requester?.company || "No company"}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <MemberAvatar member={recipient} size={36} />
                            <div>
                              <div className="fw-medium">{recipient?.name || "Unknown member"}</div>
                              <small className="text-muted">{recipient?.company || "No company"}</small>
                            </div>
                          </div>
                        </td>
                        <td>{eventTitle}</td>
                        <td>{formatDateTime(request.proposedAt)}</td>
                        <td>
                          <span className="d-inline-block text-truncate text-muted"
                            style={{ maxWidth: 240 }} title={request.message}>
                            {request.message || "No message provided"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusClass(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="text-end">
                          {isPending ? (
                            <div className="d-flex justify-content-end gap-2">
                              <button type="button" className="btn btn-sm btn-success"
                                onClick={() => updateRequestStatus(request.id, "Accepted")}>
                                <i className="ri-check-line me-1" />Accept
                              </button>
                              <button type="button" className="btn btn-sm btn-outline-danger"
                                onClick={() => updateRequestStatus(request.id, "Rejected")}>
                                <i className="ri-close-line me-1" />Reject
                              </button>
                            </div>
                          ) : (
                            <small className="text-muted">Decision recorded</small>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
        <div className="card-footer">
          <small className="text-muted">
            Demo request data. Decisions update this page only and are not saved to a database.
          </small>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
          <div>
            <h5 className="mb-1">One-to-One Meetings</h5>
            <small className="text-muted">
              {selectedEvent
                ? selectedEvent.title
                : "Meetings across all events"}
            </small>
          </div>
          <span className="badge bg-label-primary align-self-start align-self-sm-center">
            {filteredMeetings.length}{" "}
            {filteredMeetings.length === 1 ? "meeting" : "meetings"}
          </span>
        </div>

        {filteredMeetings.length === 0 ? (
          <div className="card-body text-center py-5">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
              style={{
                width: 72,
                height: 72,
                background: "rgba(105,108,255,0.12)",
                color: "#696cff",
              }}
            >
              <i className="ri-calendar-close-line" style={{ fontSize: 32 }} />
            </div>
            <h5>No meetings found</h5>
            <p className="text-muted mb-3">
              Try selecting another event or clearing your filters.
            </p>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ minWidth: 230 }}>Attendees</th>
                  <th style={{ minWidth: 165 }}>Date &amp; time</th>
                  <th style={{ minWidth: 220 }}>Outcome</th>
                  <th style={{ minWidth: 150 }}>Business</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredMeetings.map((meeting) => {
                  const attendeeA = members[meeting.aId];
                  const attendeeB = members[meeting.bId];

                  return (
                    <tr key={meeting.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div
                            className="d-flex align-items-center"
                            style={{ paddingRight: 8 }}
                          >
                            <MemberAvatar member={attendeeA} size={36} />
                            <div style={{ marginLeft: -10 }}>
                              <MemberAvatar member={attendeeB} size={36} />
                            </div>
                          </div>

                          <div className="ms-2">
                            <div className="fw-medium">
                              {attendeeA?.name || "Unknown member"}
                            </div>
                            <div className="text-muted small">
                              with {attendeeB?.name || "Unknown member"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="fw-medium">
                          {formatDateTime(meeting.scheduledAt)}
                        </div>
                      </td>

                      <td>
                        <span
                          className="d-inline-block text-truncate text-muted"
                          style={{ maxWidth: 240 }}
                          title={meeting.outcome || "No outcome recorded"}
                        >
                          {meeting.outcome || "No outcome recorded"}
                        </span>
                      </td>

                      <td>
                        <div className="small mb-1">
                          <span className="text-muted">Given: </span>
                          <span className="fw-medium">
                            {Number(meeting.businessGivenByA) || 0}
                          </span>
                        </div>
                        <div className="small">
                          <span className="text-muted">Received: </span>
                          <span className="fw-medium">
                            {Number(meeting.businessGivenByB) || 0}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${getStatusClass(meeting.status)}`}
                        >
                          {meeting.status || "Pending"}
                        </span>
                      </td>

                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-icon btn-text-secondary rounded-pill"
                          aria-label={`View meeting ${meeting.id}`}
                          onClick={() => setSelectedMeeting(meeting)}
                        >
                          <i className="ri-eye-line fs-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="card-footer d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
          <small className="text-muted">
            Displaying demo meeting data. API integration will be added later.
          </small>
          <small className="text-muted">
            {filteredMeetings.length} results
          </small>
        </div>
      </div>

      {selectedMeeting && (
        <div
          className="modal d-block"
          role="dialog"
          aria-modal="true"
          aria-labelledby="meetingDetailsTitle"
          style={{ backgroundColor: "rgba(67,89,113,0.5)", zIndex: 1090 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedMeeting(null);
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title mb-1" id="meetingDetailsTitle">
                    Meeting details
                  </h5>
                  <small className="text-muted">
                    Review attendees and meeting information
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setSelectedMeeting(null)}
                />
              </div>

              <div className="modal-body">
                <div className="d-flex align-items-center gap-3 mb-4">
                  <MemberAvatar
                    member={members[selectedMeeting.aId]}
                    size={48}
                  />
                  <div className="flex-grow-1">
                    <div className="fw-medium">
                      {members[selectedMeeting.aId]?.name || "Unknown member"}
                    </div>
                    <small className="text-muted">
                      {members[selectedMeeting.aId]?.company || "No company"}
                    </small>
                  </div>
                  <span className="text-muted small">with</span>
                  <MemberAvatar
                    member={members[selectedMeeting.bId]}
                    size={48}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label text-muted small">
                    Second attendee
                  </label>
                  <div className="fw-medium">
                    {members[selectedMeeting.bId]?.name || "Unknown member"}
                  </div>
                  <small className="text-muted">
                    {members[selectedMeeting.bId]?.company || "No company"}
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label text-muted small">
                    Event
                  </label>
                  <div className="fw-medium">
                    {events.find(
                      (event) => event.id === selectedMeeting.eventId
                    )?.title || "Unknown event"}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-muted small">
                    Date and time
                  </label>
                  <div>{formatDateTime(selectedMeeting.scheduledAt)}</div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-muted small">
                    Meeting outcome
                  </label>
                  <p className="mb-0">
                    {selectedMeeting.outcome || "No outcome recorded"}
                  </p>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <div className="p-3 rounded bg-label-primary">
                      <small>Business given by A</small>
                      <h4 className="mb-0 mt-1">
                        {Number(selectedMeeting.businessGivenByA) || 0}
                      </h4>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 rounded bg-label-success">
                      <small>Business given by B</small>
                      <h4 className="mb-0 mt-1">
                        {Number(selectedMeeting.businessGivenByB) || 0}
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <label htmlFor="meetingStatus" className="form-label">
                    Update meeting status
                  </label>
                  <select
                    id="meetingStatus"
                    className="form-select"
                    value={selectedMeeting.status || "Scheduled"}
                    onChange={(event) =>
                      updateMeetingStatus(
                        selectedMeeting.id,
                        event.target.value
                      )
                    }
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Canceled">Canceled</option>
                  </select>
                  <small className="text-muted">
                    Demo only. Status changes are not saved to a database.
                  </small>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSelectedMeeting(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
