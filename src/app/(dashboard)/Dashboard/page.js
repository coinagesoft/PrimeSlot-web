"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });



const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function InitialAvatar({ member, size = 42 }) {
  const colorClass = {
    primary: "bg-label-primary",
    success: "bg-label-success",
    warning: "bg-label-warning",
    info: "bg-label-info",
  }[member?.color] || "bg-label-primary";

  const initials =
    member?.initials ||
    member?.fullName
      ?.split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("") ||
    "M";

  return (
    <div
      className={`avatar-initial rounded-circle ${colorClass} d-flex align-items-center justify-content-center fw-semibold flex-shrink-0`}
      style={{
        width: size,
        height: size,
        fontSize: size < 40 ? 12 : 14,
      }}
      aria-label={member?.fullName || "Member"}
    >
      {initials}
    </div>
  );
}

function StatCard({ title, value, detail, icon, tone, trend }) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card h-100 dashboard-stat-card">
        <div className="card-body">
          <div className="d-flex align-items-start justify-content-between gap-3">
            <div>
              <p className="text-muted mb-2 small">{title}</p>
              <h3 className="mb-1 fw-bold">{value}</h3>

              <div className="d-flex align-items-center flex-wrap gap-1 small">
                <span className={`text-${tone} fw-semibold`}>
                  {trend}
                </span>
                <span className="text-muted">{detail}</span>
              </div>
            </div>

            <div
              className={`dashboard-stat-icon bg-label-${tone} rounded-3 d-flex align-items-center justify-content-center`}
            >
              <i className={`${icon} ri-xl`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [monthlyMeetings, setMonthlyMeetings] = useState([]);

  const [stats, setStats] = useState({
    totalAppointments: 0,
    activeMembers: 0,
    upcomingEvents: 0,
    pendingRequests: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [period, setPeriod] = useState("This year");
  const [eventSearch, setEventSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/dashboard", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load dashboard data."
          );
        }

        if (cancelled) return;

        const data = result.data;

        setStats({
          totalAppointments: data.totalMeetings ?? 0,
          activeMembers: data.activeMembers ?? 0,
          upcomingEvents: data.upcomingEvents ?? 0,
          pendingRequests: data.pendingRequests ?? 0,
        });

        setEvents(data.upcomingEventsList ?? []);
        setMembers(data.members ?? []);
        setMeetings(data.recentMeetings ?? []);
        setMonthlyMeetings(data.monthlyMeetings ?? []);
      } catch (err) {
        if (!cancelled) {
          console.error("Dashboard fetch error:", err);
          setError(err.message || "Unable to load dashboard.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, []);


  const chartMonths =
    period === "This year"
      ? monthlyMeetings.filter(
        (item) => Number(item.year) === new Date().getFullYear()
      )
      : monthlyMeetings;

  const chartCategories = chartMonths.map((item) => item.month);

  const chartSeries = [
    {
      name: "Meetings",
      data: chartMonths.map((item) => Number(item.total) || 0),
    },
  ];

  const chartOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "inherit",
      foreColor: "#6f6b7d",
    },
    colors: ["#696cff"],
    dataLabels: { enabled: false },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.22,
        opacityTo: 0.02,
        stops: [0, 90, 100],
      },
    },
    grid: {
      borderColor: "#ebe9f1",
      strokeDashArray: 4,
      padding: { left: 8, right: 8 },
    },
    xaxis: {
      categories: chartCategories,
      axisBorder: { show: false },
      axisTicks: { show: false },

    },
    yaxis: {
      min: 0,
      tickAmount: 4,
      labels: {
        formatter: (value) => Math.round(value).toString(),
      },
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (value) => `${value} meetings`,
      },
    },
    markers: {
      size: 0,
      hover: { size: 5 },
    },
  };



  const filteredEvents = events.filter((event) =>
    `${event.title} ${event.location}`
      .toLowerCase()
      .includes(eventSearch.toLowerCase())
  );

  const getMember = (id) => members.find((member) => String(member.id) === String(id));

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="container-xxl flex-grow-1 container-p-y primeslot-dashboard">
      <style jsx>{`
        .primeslot-dashboard .dashboard-stat-card {
          border: 1px solid rgba(105, 108, 255, 0.08);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .primeslot-dashboard .dashboard-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(67, 89, 113, 0.1);
        }

        .primeslot-dashboard .dashboard-stat-icon {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
        }

        .primeslot-dashboard .dashboard-section-card {
          overflow: hidden;
        }

        .primeslot-dashboard .dashboard-section-card .card-header {
          background: transparent;
        }

        .primeslot-dashboard .dashboard-table th {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #a1acb8;
          font-weight: 600;
          white-space: nowrap;
        }

        .primeslot-dashboard .dashboard-table td {
          vertical-align: middle;
        }

        .primeslot-dashboard .member-row + .member-row {
          border-top: 1px solid #f0eff5;
        }

        .primeslot-dashboard .dashboard-link {
          color: #696cff;
          text-decoration: none;
          font-weight: 500;
          white-space: nowrap;
        }

        .primeslot-dashboard .dashboard-link:hover {
          color: #5053d8;
        }

        .primeslot-dashboard .dashboard-welcome {
          background: linear-gradient(
            115deg,
            rgba(105, 108, 255, 0.11),
            rgba(105, 108, 255, 0.025)
          );
          border: 1px solid rgba(105, 108, 255, 0.12);
        }

        .primeslot-dashboard .welcome-mark {
          width: 54px;
          height: 54px;
          background: rgba(105, 108, 255, 0.13);
          color: #696cff;
        }

        .primeslot-dashboard .demo-label {
          font-size: 11px;
          letter-spacing: 0.04em;
        }

        @media (max-width: 575.98px) {
          .primeslot-dashboard .dashboard-stat-icon {
            width: 40px;
            height: 40px;
          }

          .primeslot-dashboard .card-header,
          .primeslot-dashboard .card-body {
            padding: 1rem;
          }
        }
      `}</style>

      {/* Page heading */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          {/* <div className="text-muted small mb-1">
            ADMINISTRATION / OVERVIEW
          </div> */}
          <h4 className="fw-bold mb-1">Dashboard</h4>
          <p className="text-muted mb-0">
            Here’s what’s happening across your PrimeSlot community.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">

          <span className="text-muted small d-none d-md-inline">{today}</span>
        </div>
      </div>

      {loading && (
        <div className="alert alert-info d-flex align-items-center gap-2">
          <span
            className="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          />
          Loading dashboard data...
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          <strong>Unable to load dashboard:</strong> {error}
          <button
            type="button"
            className="btn btn-sm btn-outline-danger ms-3"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Welcome section */}
      <div className="card dashboard-welcome mb-4">
        <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3 p-4">
          <div className="d-flex align-items-center gap-3">
            <div className="welcome-mark rounded-3 d-flex align-items-center justify-content-center flex-shrink-0">
              <i className="ri-dashboard-3-line ri-2x" />
            </div>

            <div>
              <h5 className="mb-1 fw-bold">Welcome back, Admin!</h5>
              <p className="text-muted mb-0">
                Review activity and upcoming connections in your community.
              </p>
            </div>
          </div>

          <Link href="/Events" className="btn btn-primary">
            <i className="ri-calendar-event-line me-1" />
            Manage events
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="row g-3 mb-4">
        <StatCard
          title="Total Meetings"
          value={stats.totalAppointments}
          detail="Meetings in the database"
          trend=""
          icon="ri-calendar-check-line"
          tone="primary"
        />

        <StatCard
          title="Active Members"
          value={stats.activeMembers}
          detail={`of ${members.length} members`}
          trend=""
          icon="ri-user-follow-line"
          tone="success"
        />

        <StatCard
          title="Upcoming Events"
          value={stats.upcomingEvents}
          detail="Scheduled events"
          trend=""
          icon="ri-calendar-event-line"
          tone="warning"
        />

        <StatCard
          title="Pending Requests"
          value={stats.pendingRequests}
          detail="Awaiting action"
          trend=""
          icon="ri-time-line"
          tone="info"
        />
      </div>

      {/* Meetings chart and member activity */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-8">
          <div className="card dashboard-section-card h-100">
            <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2 py-3">
              <div>
                <h5 className="card-title mb-1">Meetings overview</h5>
                <small className="text-muted">
                  Monthly meeting activity across PrimeSlot
                </small>
              </div>

              <select
                className="form-select form-select-sm"
                style={{ width: 145 }}
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                aria-label="Chart period"
              >
                <option>This year</option>
                <option>Last 12 months</option>
              </select>
            </div>

            <div className="card-body pt-1">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span
                  className="rounded-circle d-inline-block"
                  style={{
                    width: 8,
                    height: 8,
                    background: "#696cff",
                  }}
                />
                <span className="small text-muted">Meetings</span>
                <span className="small fw-semibold ms-auto">
                  Live trend
                </span>
              </div>

              <Chart
                options={chartOptions}
                series={chartSeries}
                type="area"
                height={285}
              />
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="card dashboard-section-card h-100">
            <div className="card-header d-flex align-items-center justify-content-between py-3">
              <div>
                <h5 className="card-title mb-1">Member activity</h5>
                <small className="text-muted">
                  Member status overview
                </small>
              </div>

              <span className="avatar avatar-sm">
                <span className="avatar-initial rounded bg-label-success">
                  <i className="ri-group-line" />
                </span>
              </span>
            </div>

            <div className="card-body pt-0">
              <div className="d-flex align-items-end justify-content-between mb-2">
                <div>
                  <h2 className="mb-0 fw-bold">
                    {stats.activeMembers}
                    <span className="text-muted fs-6 fw-normal">
                      {" "}/ {members.length}
                    </span>
                  </h2>
                  <small className="text-muted">Active members</small>
                </div>

                <span className="badge bg-label-success">Active</span>
              </div>

              <div className="progress mb-4" style={{ height: 8 }}>
                <div
                  className="progress-bar bg-success"
                  role="progressbar"
                  style={{
                    width: `${members.length
                      ? (stats.activeMembers / members.length) * 100
                      : 0
                      }%`,
                  }}
                  aria-valuenow={
                    members.length
                      ? (stats.activeMembers / members.length) * 100
                      : 0
                  }
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>

              {members.map((member) => (
                <div
                  key={member.id}
                  className="member-row d-flex align-items-center gap-3 py-3"
                >
                  <InitialAvatar member={member} size={40} />

                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-semibold text-truncate">
                      {member.fullName}
                    </div>
                    <small className="text-muted text-truncate d-block">
                      {member.businessCategory || member.businessName || "Member"}
                    </small>
                  </div>

                  <span
                    className={`badge ${member.memberStatus === "Active"
                      ? "bg-label-success"
                      : "bg-label-warning"
                      }`}
                  >
                    {member.memberStatus}
                  </span>
                </div>
              ))}

              <Link
                href="/UserInfo"
                className="dashboard-link d-inline-flex align-items-center mt-2"
              >
                View members <i className="ri-arrow-right-line ms-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Events and recent meetings */}
      <div className="row g-4">
        <div className="col-12 col-xl-7">
          <div className="card dashboard-section-card h-100">
            <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2 py-3">
              <div>
                <h5 className="card-title mb-1">Upcoming events</h5>
                <small className="text-muted">
                  Keep track of the next community events
                </small>
              </div>

              <Link href="/Events" className="dashboard-link">
                View all <i className="ri-arrow-right-line ms-1" />
              </Link>
            </div>

            <div className="px-3 pb-2">
              <div className="input-group input-group-merge">
                <span className="input-group-text">
                  <i className="ri-search-line" />
                </span>

                <input
                  type="search"
                  className="form-control"
                  placeholder="Search events or locations..."
                  value={eventSearch}
                  onChange={(event) => setEventSearch(event.target.value)}
                  aria-label="Search events"
                />

                {eventSearch && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setEventSearch("")}
                    aria-label="Clear search"
                  >
                    <i className="ri-close-line" />
                  </button>
                )}
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover dashboard-table mb-0">
                <thead>
                  <tr>
                    <th className="ps-4">Event</th>
                    <th>Date</th>
                    <th>Attendees</th>
                    <th className="pe-4" />
                  </tr>
                </thead>

                <tbody>
                  {filteredEvents.slice(0, 4).map((event) => (
                    <tr key={event.id}>
                      <td className="ps-4">
                        <div className="fw-semibold">{event.title}</div>
                        <small className="text-muted">
                          <i className="ri-map-pin-line me-1" />
                          {event.location}
                        </small>
                      </td>

                      <td className="text-nowrap">
                        {formatDate(event.date)}
                      </td>

                      <td>
                        <span className="badge bg-label-primary">
                          {event.attendees}
                        </span>
                      </td>

                      <td className="pe-4 text-end">
                        <Link
                          href="/Events"
                          className="btn btn-sm btn-icon btn-text-secondary"
                          aria-label={`View ${event.title}`}
                        >
                          <i className="ri-arrow-right-up-line" />
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {filteredEvents.length === 0 && (
                    <tr>
                      <td
                        colSpan="4"
                        className="text-center text-muted py-4"
                      >
                        No events match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="card dashboard-section-card h-100">
            <div className="card-header d-flex align-items-center justify-content-between py-3">
              <div>
                <h5 className="card-title mb-1">Recent meetings</h5>
                <small className="text-muted">
                  Latest scheduled connections
                </small>
              </div>

              <Link href="/Meetings" className="dashboard-link">
                View all <i className="ri-arrow-right-line ms-1" />
              </Link>
            </div>

            <div className="card-body pt-0">
              {meetings.map((meeting) => {
                const personA = getMember(meeting.aId);
                const personB = getMember(meeting.bId);

                return (
                  <div
                    key={meeting.id}
                    className="member-row d-flex align-items-start gap-3 py-3"
                  >
                    <div
                      className="rounded-3 bg-label-primary d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 42, height: 42 }}
                    >
                      <i className="ri-calendar-check-line ri-lg" />
                    </div>

                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-semibold mb-1">
                        {meeting.topic}
                      </div>

                      <div className="small text-muted mb-1">
                        {personA?.fullName || "Member"}
                        <i className="ri-arrow-right-line mx-1" />
                        {personB?.fullName || "Member"}
                      </div>

                      <small className="text-muted">
                        <i className="ri-time-line me-1" />
                        {formatDate(meeting.scheduledAt)} ·{" "}
                        {formatTime(meeting.scheduledAt)}
                      </small>
                    </div>

                    <span
                      className={`badge ${["approved", "confirmed", "scheduled"].includes(
                        String(meeting.status || "").toLowerCase()
                      )
                        ? "bg-label-success"
                        : "bg-label-warning"
                        }`}
                    >
                      {meeting.status || "Unknown"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted small text-center mt-4 mb-0">
        PrimeSlot Admin · Dashboard data from MySQL
      </p>
    </div>
  );
}