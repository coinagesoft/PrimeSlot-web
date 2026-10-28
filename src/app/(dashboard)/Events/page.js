
"use client";

import React, { useEffect, useMemo, useState } from "react";



const INITIAL_EVENT_DATA = {
  title: "",
  description: "",
  date: "",
  location: "",
  status: "published",
};

function formatDate(value) {
  if (!value) return "Date not set";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "Date not set";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getEventDateStatus(date) {
  if (!date) return "Unscheduled";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDate = new Date(`${date.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(eventDate.getTime())) return "Unscheduled";
  if (eventDate < today) return "Completed";
  if (eventDate.getTime() === today.getTime()) return "Today";

  return "Upcoming";
}

function StatusBadge({ status }) {
  const normalizedStatus = (status || "published").toLowerCase();

  const badgeClass =
    normalizedStatus === "published"
      ? "bg-label-success"
      : normalizedStatus === "draft"
        ? "bg-label-warning"
        : "bg-label-secondary";

  return (
    <span
      className={`badge ${badgeClass} text-capitalize`}
      style={{ fontSize: "0.75rem" }}
    >
      {normalizedStatus}
    </span>
  );
}

function EventDateIcon() {
  return (
    <div
      className="d-flex align-items-center justify-content-center rounded"
      style={{
        width: 48,
        height: 48,
        flexShrink: 0,
        background: "rgba(105,108,255,0.12)",
        color: "#696cff",
      }}
    >
      <i className="ri-calendar-event-line" style={{ fontSize: 24 }} />
    </div>
  );
}

function EventCard({ event, onEdit, onDelete }) {
  const dateStatus = getEventDateStatus(event.date);

  return (
    <div className="col-12 col-md-6 col-xl-4 d-flex">
      <div
        className="card w-100 h-100"
        style={{
          borderRadius: 14,
          border: "1px solid rgba(67,89,113,0.12)",
          transition: "box-shadow 0.2s ease, transform 0.2s ease",
        }}
      >
        <div className="card-body d-flex flex-column p-4">
          <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
            <EventDateIcon />

            <div className="dropdown">
              <button
                type="button"
                className="btn btn-sm btn-icon rounded-pill"
                data-bs-toggle="dropdown"
                aria-label={`Actions for ${event.title}`}
              >
                <i className="ri-more-2-fill" />
              </button>

              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => onEdit(event)}
                  >
                    <i className="ri-pencil-line me-2" />
                    Edit event
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="dropdown-item text-danger"
                    onClick={() => onDelete(event.id)}
                  >
                    <i className="ri-delete-bin-7-line me-2" />
                    Delete event
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
            <StatusBadge status={event.status} />
            <span className="text-muted small">{dateStatus}</span>
          </div>

          <h5
            className="card-title mb-2"
            style={{ lineHeight: 1.45, overflowWrap: "anywhere" }}
          >
            {event.title}
          </h5>

          <p
            className="text-muted mb-4"
            style={{
              fontSize: 13,
              lineHeight: 1.7,
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: 66,
            }}
          >
            {event.description || "No description has been added yet."}
          </p>

          <div className="mt-auto pt-3 border-top">
            <div className="d-flex align-items-center gap-2 mb-2">
              <i
                className="ri-calendar-2-line"
                style={{ color: "#696cff", fontSize: 18 }}
              />
              <span className="small">{formatDate(event.date)}</span>
            </div>

            <div className="d-flex align-items-start gap-2">
              <i
                className="ri-map-pin-line"
                style={{ color: "#696cff", fontSize: 18 }}
              />
              <span className="small text-muted">
                {event.location || "Location not specified"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline-primary w-100 mt-4"
            onClick={() => onEdit(event)}
          >
            <i className="ri-edit-line me-1" />
            Manage event
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  // Demo data only. API integration will be added in the next stage.
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(INITIAL_EVENT_DATA);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchEvents = async () => {
    try {
      setApiError("");

      const response = await fetch("/api/events", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch events.");
      }

      setEvents(Array.isArray(result.records) ? result.records : []);
    } catch (error) {
      console.error("Error fetching events:", error);
      setApiError(error.message || "Unable to load events.");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);


  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: events.length,
      published: events.filter(
        (event) => (event.status || "").toLowerCase() === "published"
      ).length,
      drafts: events.filter(
        (event) => (event.status || "").toLowerCase() === "draft"
      ).length,
      upcoming: events.filter((event) => {
        if (!event.date) return false;
        const date = new Date(`${event.date.slice(0, 10)}T00:00:00`);
        return !Number.isNaN(date.getTime()) && date >= today;
      }).length,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
      .filter((event) => {
        const matchesSearch =
          !normalizedSearch ||
          [event.title, event.description, event.location]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch));

        const normalizedStatus = (event.status || "published").toLowerCase();

        const matchesStatus =
          statusFilter === "all" || normalizedStatus === statusFilter;

        let matchesDate = true;

        if (dateFilter === "upcoming") {
          const date = event.date
            ? new Date(`${event.date.slice(0, 10)}T00:00:00`)
            : null;

          matchesDate =
            date !== null &&
            !Number.isNaN(date.getTime()) &&
            date >= today;
        }

        if (dateFilter === "past") {
          const date = event.date
            ? new Date(`${event.date.slice(0, 10)}T00:00:00`)
            : null;

          matchesDate =
            date !== null &&
            !Number.isNaN(date.getTime()) &&
            date < today;
        }

        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });
  }, [events, search, statusFilter, dateFilter]);

  const openCreateModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setCurrentEvent({ ...INITIAL_EVENT_DATA });
    setFormError("");
    setNotice("");
    setIsModalOpen(true);
  };

  const openEditModal = (event) => {
    setIsEditMode(true);
    setEditingId(event.id);

    setCurrentEvent({
      title: event.title || "",
      description: event.description || "",
      date: event.date ? event.date.slice(0, 10) : "",
      location: event.location || "",
      status: (event.status || "published").toLowerCase(),
    });

    setFormError("");
    setNotice("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;

    setIsModalOpen(false);
    setFormError("");
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setCurrentEvent((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (formError) setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSaving) return;

    const title = currentEvent.title.trim();
    const location = currentEvent.location.trim();
    const description = currentEvent.description.trim();

    if (!title || !currentEvent.date || !location) {
      setFormError(
        "Please complete the event title, date, and location."
      );
      return;
    }

    setIsSaving(true);
    setFormError("");
    setNotice("");
    setApiError("");

    try {
      const payload = {
        title,
        description,
        date: currentEvent.date,
        location,
        status: currentEvent.status,
      };

      // POST creates a new event; PUT updates an existing event.
      const url = isEditMode
        ? `/api/events/${encodeURIComponent(editingId)}`
        : "/api/events";

      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.details ||
          result.error ||
          result.message ||
          `Failed to ${isEditMode ? "update" : "create"} event.`
        );
      }

      if (result.success === false) {
        throw new Error(result.error || "The operation failed.");
      }

      // Reload the list from MySQL to keep the UI synchronized.
      await fetchEvents();

      setNotice(
        isEditMode
          ? "Event updated successfully."
          : "Event created successfully."
      );

      setIsModalOpen(false);
      setCurrentEvent({ ...INITIAL_EVENT_DATA });
      setEditingId(null);
      setIsEditMode(false);
    } catch (error) {
      console.error("Error saving event:", error);

      setFormError(
        error.message || "Unable to save the event. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (eventId) => {
    const event = events.find((item) => item.id === eventId);
    if (!event) return;

    setDeleteTarget(event);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const eventToDelete = deleteTarget;

    try {
      setApiError("");

      const response = await fetch(
        `/api/events/${encodeURIComponent(eventToDelete.id)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          result.message ||
          "Failed to delete the event."
        );
      }

      if (result.success === false) {
        throw new Error(result.error || "Failed to delete the event.");
      }

      // Update the UI only after the database deletion succeeds.
      setEvents((previous) =>
        previous.filter((event) => event.id !== eventToDelete.id)
      );

      setNotice(`"${eventToDelete.title}" was deleted successfully.`);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting event:", error);

      setApiError(
        error.message || "Unable to delete the event. Please try again."
      );
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFilter("all");
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1">Events Management</h4>
          <p className="text-muted mb-0">
            Create, organize, and manage your PrimeSlot events.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateModal}
        >
          <i className="ri-add-line me-1" />
          Create event
        </button>
      </div>

      {notice && (
        <div
          className="alert alert-success alert-dismissible d-flex align-items-center mb-4"
          role="status"
        >
          <i className="ri-checkbox-circle-line me-2 fs-5" />
          <span>{notice}</span>
          <button
            type="button"
            className="btn-close ms-auto"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          />
        </div>
      )}
      {apiError && (
        <div className="alert alert-danger" role="alert">
          <i className="ri-error-warning-line me-2" />
          {apiError}

          <button
            type="button"
            className="btn btn-sm btn-outline-danger ms-3"
            onClick={fetchEvents}
          >
            Retry
          </button>
        </div>
      )}
      <div className="row g-4 mb-4">
        <div className="col-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div
                  className="avatar"
                  style={{
                    background: "rgba(105,108,255,0.12)",
                    color: "#696cff",
                  }}
                >
                  <span className="avatar-initial rounded">
                    <i className="ri-calendar-event-line fs-4" />
                  </span>
                </div>
                <span className="badge bg-label-primary">All</span>
              </div>
              <h4 className="mb-1">{stats.total}</h4>
              <p className="mb-0 text-muted">Total events</p>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="avatar bg-label-success">
                  <span className="avatar-initial rounded">
                    <i className="ri-checkbox-circle-line fs-4" />
                  </span>
                </div>
                <span className="badge bg-label-success">Live</span>
              </div>
              <h4 className="mb-1">{stats.published}</h4>
              <p className="mb-0 text-muted">Published</p>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="avatar bg-label-warning">
                  <span className="avatar-initial rounded">
                    <i className="ri-draft-line fs-4" />
                  </span>
                </div>
                <span className="badge bg-label-warning">Draft</span>
              </div>
              <h4 className="mb-1">{stats.drafts}</h4>
              <p className="mb-0 text-muted">Draft events</p>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="avatar bg-label-info">
                  <span className="avatar-initial rounded">
                    <i className="ri-calendar-check-line fs-4" />
                  </span>
                </div>
                <span className="badge bg-label-info">Scheduled</span>
              </div>
              <h4 className="mb-1">{stats.upcoming}</h4>
              <p className="mb-0 text-muted">Upcoming events</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center g-3">
            <div className="col-12 col-lg-5">
              <div className="input-group input-group-merge">
                <span className="input-group-text">
                  <i className="ri-search-line" />
                </span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search title, description, or location..."
                  aria-label="Search events"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <i className="ri-close-line" />
                  </button>
                )}
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <select
                className="form-select"
                aria-label="Filter by publication status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div className="col-6 col-lg-2">
              <select
                className="form-select"
                aria-label="Filter by date"
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
                Reset filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h5 className="mb-0">All events</h5>
        <span className="text-muted small">
          Showing {filteredEvents.length} of {events.length} events
        </span>
      </div>

      {isLoading ? (
        <div className="card">
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
            <h5>
              {events.length === 0 ? "No events yet" : "No matching events"}
            </h5>
            <p className="text-muted mb-4">
              {events.length === 0
                ? "Create your first event to get started."
                : "Try changing your search or filter settings."}
            </p>
            {events.length === 0 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreateModal}
              >
                <i className="ri-add-line me-1" />
                Create your first event
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          aria-labelledby="eventModalTitle"
          style={{ backgroundColor: "rgba(67,89,113,0.5)", zIndex: 1090 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
            role="document"
            style={{
              maxWidth: "720px",
              height: "calc(100vh - 2rem)",
              maxHeight: "calc(100vh - 2rem)",
              marginTop: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div
              className="modal-content"
              style={{
                height: "100%",
                maxHeight: "100%",
                overflow: "hidden",
              }}
            >
             <form
  onSubmit={handleSubmit}
  style={{
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
  }}
>
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title mb-1" id="eventModalTitle">
                      {isEditMode ? "Edit event" : "Create new event"}
                    </h5>
                    <small className="text-muted">
                      {isEditMode
                        ? "Update the event information below."
                        : "Add the details for your upcoming event."}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={closeModal}
                    disabled={isSaving}
                  />
                </div>

                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger" role="alert">
                      <i className="ri-error-warning-line me-2" />
                      {formError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="title" className="form-label">
                      Event title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      className="form-control"
                      placeholder="e.g. Business Networking Meetup"
                      value={currentEvent.title}
                      onChange={handleInputChange}
                      maxLength={120}
                      required
                      disabled={isSaving}
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-12 col-sm-6">
                      <label htmlFor="date" className="form-label">
                        Event date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        id="date"
                        name="date"
                        className="form-control"
                        value={currentEvent.date}
                        onChange={handleInputChange}
                        required
                        disabled={isSaving}
                      />
                    </div>

                    <div className="col-12 col-sm-6">
                      <label htmlFor="status" className="form-label">
                        Publication status
                      </label>
                      <select
                        id="status"
                        name="status"
                        className="form-select"
                        value={currentEvent.status}
                        onChange={handleInputChange}
                        disabled={isSaving}
                      >
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="location" className="form-label">
                      Location <span className="text-danger">*</span>
                    </label>
                    <div className="input-group input-group-merge">
                      <span className="input-group-text">
                        <i className="ri-map-pin-line" />
                      </span>
                      <input
                        type="text"
                        id="location"
                        name="location"
                        className="form-control"
                        placeholder="City or venue"
                        value={currentEvent.location}
                        onChange={handleInputChange}
                        maxLength={180}
                        required
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label htmlFor="description" className="form-label">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      className="form-control"
                      rows={4}
                      placeholder="Describe the event and what attendees can expect..."
                      value={currentEvent.description}
                      onChange={handleInputChange}
                      maxLength={1500}
                      disabled={isSaving}
                    />
                    <div className="text-end text-muted small mt-1">
                      {currentEvent.description.length}/1500
                    </div>
                  </div>
                </div>

                <div
                  className="modal-footer"
                  style={{
                    flexShrink: 0,
                    backgroundColor: "#fff",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-label-secondary"
                    onClick={closeModal}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <i
                          className={`${isEditMode ? "ri-save-line" : "ri-add-line"
                            } me-1`}
                        />
                        {isEditMode ? "Save changes" : "Create event"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deleteEventTitle"
          style={{ backgroundColor: "rgba(67,89,113,0.5)", zIndex: 1100 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-body text-center p-4">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                  style={{
                    width: 64,
                    height: 64,
                    background: "rgba(255,62,29,0.12)",
                    color: "#ff3e1d",
                  }}
                >
                  <i
                    className="ri-delete-bin-7-line"
                    style={{ fontSize: 28 }}
                  />
                </div>
                <h5 id="deleteEventTitle">Delete this event?</h5>
                <p className="text-muted mb-4">
                  Are you sure you want to delete{" "}
                  <strong>{deleteTarget.title}</strong>? This action cannot be
                  undone.
                </p>
                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-label-secondary"
                    onClick={() => setDeleteTarget(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={confirmDelete}
                  >
                    <i className="ri-delete-bin-7-line me-1" />
                    Delete event
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
