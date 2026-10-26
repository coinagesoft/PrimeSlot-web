
"use client";

import React, { useMemo, useState } from "react";

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    title: "User Role Updated",
    description:
      "You have been assigned the 'Editor' role by an administrator.",
    time: "15m ago",
    category: "Account",
    read: false,
    icon: "ri-shield-user-line",
    color: "primary",
    user: "Admin",
    createdAt: "2026-10-21T08:45:00",
  },
  {
    id: 2,
    title: "Account Approved",
    description: "John Doe's account has been approved and is now active.",
    time: "1h ago",
    category: "Members",
    read: false,
    icon: "ri-user-follow-line",
    color: "success",
    user: "John Doe",
    createdAt: "2026-10-21T08:00:00",
  },
  {
    id: 3,
    title: "New User Registration",
    description:
      "Mary Jane has registered and is awaiting account approval.",
    time: "5h ago",
    category: "Members",
    read: true,
    icon: "ri-user-add-line",
    color: "info",
    user: "Mary Jane",
    createdAt: "2026-10-21T04:00:00",
  },
  {
    id: 4,
    title: "Permission Granted",
    description:
      "You have been granted access to the Financial Management module.",
    time: "1d ago",
    category: "Security",
    read: true,
    icon: "ri-lock-unlock-line",
    color: "warning",
    user: "Admin",
    createdAt: "2026-10-20T09:00:00",
  },
  {
    id: 5,
    title: "Access Revoked",
    description:
      "Peter Jones's access to Project Planning has been revoked.",
    time: "2d ago",
    category: "Security",
    read: true,
    icon: "ri-shield-keyhole-line",
    color: "danger",
    user: "Peter Jones",
    createdAt: "2026-10-19T09:00:00",
  },
];

function NotificationIcon({ notification, size = 44 }) {
  return (
    <div
      className={`avatar bg-label-${notification.color || "primary"}`}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <span className="avatar-initial rounded">
        <i
          className={notification.icon || "ri-notification-3-line"}
          style={{ fontSize: size === 44 ? 22 : 19 }}
        />
      </span>
    </div>
  );
}

function NotificationBadge({ category }) {
  const colorMap = {
    Account: "primary",
    Members: "success",
    Security: "warning",
    Events: "info",
    Meetings: "info",
    System: "secondary",
  };

  return (
    <span
      className={`badge bg-label-${colorMap[category] || "secondary"}`}
    >
      {category || "General"}
    </span>
  );
}

export default function NotificationsPage() {
  // Demo data only. Backend integration will be added later.
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showClearReadConfirmation, setShowClearReadConfirmation] =
    useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const readCount = notifications.length - unreadCount;

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          notification.title,
          notification.description,
          notification.category,
          notification.user,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "unread" && !notification.read) ||
        (activeFilter === "read" && notification.read);

      return matchesSearch && matchesFilter;
    });
  }, [notifications, activeFilter, search]);

  const visibleIds = filteredNotifications.map(
    (notification) => notification.id
  );

  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds.includes(id));

  const toggleSelected = (id) => {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((selectedId) => selectedId !== id)
        : [...previous, id]
    );
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((previous) =>
        previous.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedIds((previous) => [
        ...new Set([...previous, ...visibleIds]),
      ]);
    }
  };

  const markAsRead = (id) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    setNotice("Notification marked as read.");
  };

  const markAsUnread = (id) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id
          ? { ...notification, read: false }
          : notification
      )
    );
    setNotice("Notification marked as unread.");
  };

  const markAllAsRead = () => {
    if (unreadCount === 0) return;

    setNotifications((previous) =>
      previous.map((notification) => ({ ...notification, read: true }))
    );
    setSelectedIds([]);
    setNotice("All notifications marked as read.");
  };

  const markSelectedAsRead = () => {
    if (selectedIds.length === 0) return;

    setNotifications((previous) =>
      previous.map((notification) =>
        selectedIds.includes(notification.id)
          ? { ...notification, read: true }
          : notification
      )
    );
    setSelectedIds([]);
    setNotice("Selected notifications marked as read.");
  };

  const deleteNotification = (id) => {
    const notification = notifications.find((item) => item.id === id);
    if (!notification) return;

    setDeleteTarget(notification);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    setNotifications((previous) =>
      previous.filter((notification) => notification.id !== deleteTarget.id)
    );
    setSelectedIds((previous) =>
      previous.filter((id) => id !== deleteTarget.id)
    );
    setNotice("Notification deleted.");
    setDeleteTarget(null);
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;

    setNotifications((previous) =>
      previous.filter(
        (notification) => !selectedIds.includes(notification.id)
      )
    );
    setSelectedIds([]);
    setNotice("Selected notifications deleted.");
  };

  const clearReadNotifications = () => {
    const readNotifications = notifications.filter(
      (notification) => notification.read
    );

    if (readNotifications.length === 0) {
      setShowClearReadConfirmation(false);
      return;
    }

    const readIds = readNotifications.map((notification) => notification.id);

    setNotifications((previous) =>
      previous.filter((notification) => !notification.read)
    );
    setSelectedIds((previous) =>
      previous.filter((id) => !readIds.includes(id))
    );
    setShowClearReadConfirmation(false);
    setNotice("All read notifications cleared.");
  };

  const clearFilters = () => {
    setSearch("");
    setActiveFilter("all");
    setSelectedIds([]);
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1">
            {/* <span className="text-muted fw-light">Settings / </span> */}
            Notifications
          </h4>
          <p className="text-muted mb-0">
            Stay updated with member activity, account changes, and system
            alerts.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <i className="ri-mail-check-line me-1" />
            Mark all as read
          </button>
        </div>
      </div>

      {notice && (
        <div
          className="alert alert-success d-flex align-items-center mb-4"
          role="status"
        >
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
        <div className="col-6 col-xl-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                <div className="avatar bg-label-primary">
                  <span className="avatar-initial rounded">
                    <i className="ri-notification-3-line fs-4" />
                  </span>
                </div>
                <span className="badge bg-label-primary">All</span>
              </div>
              <h4 className="mb-1">{notifications.length}</h4>
              <p className="mb-0 text-muted">Total notifications</p>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                <div className="avatar bg-label-warning">
                  <span className="avatar-initial rounded">
                    <i className="ri-mail-unread-line fs-4" />
                  </span>
                </div>
                <span className="badge bg-label-warning">New</span>
              </div>
              <h4 className="mb-1">{unreadCount}</h4>
              <p className="mb-0 text-muted">Unread notifications</p>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                <div className="avatar bg-label-success">
                  <span className="avatar-initial rounded">
                    <i className="ri-mail-check-line fs-4" />
                  </span>
                </div>
                <span className="badge bg-label-success">Read</span>
              </div>
              <h4 className="mb-1">{readCount}</h4>
              <p className="mb-0 text-muted">Read notifications</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header pb-0">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
            <div>
              <h5 className="card-title mb-1">Recent notifications</h5>
              <p className="text-muted mb-0 small">
                Review and manage your notifications.
              </p>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setShowClearReadConfirmation(true)}
                disabled={readCount === 0}
              >
                <i className="ri-delete-bin-6-line me-1" />
                Clear read
              </button>
            </div>
          </div>

          <div className="row g-3 mt-2 mb-3">
            <div className="col-12 col-lg-6">
              <div className="input-group input-group-merge">
                <span className="input-group-text">
                  <i className="ri-search-line" />
                </span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search notifications..."
                  aria-label="Search notifications"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSelectedIds([]);
                  }}
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

            <div className="col-12 col-lg-6">
              <div className="d-flex flex-wrap gap-2 justify-content-lg-end">
                {[
                  { value: "all", label: "All", count: notifications.length },
                  { value: "unread", label: "Unread", count: unreadCount },
                  { value: "read", label: "Read", count: readCount },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={`btn btn-sm ${
                      activeFilter === filter.value
                        ? "btn-primary"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => {
                      setActiveFilter(filter.value);
                      setSelectedIds([]);
                    }}
                  >
                    {filter.label}
                    <span
                      className={`badge ms-2 ${
                        activeFilter === filter.value
                          ? "bg-white text-primary"
                          : "bg-label-secondary"
                      }`}
                    >
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="alert alert-primary d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-3">
              <span>
                <strong>{selectedIds.length}</strong> notification
                {selectedIds.length !== 1 ? "s" : ""} selected
              </span>
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={markSelectedAsRead}
                >
                  <i className="ri-mail-check-line me-1" />
                  Mark as read
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={deleteSelected}
                >
                  <i className="ri-delete-bin-line me-1" />
                  Delete selected
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelectedIds([])}
                >
                  Deselect
                </button>
              </div>
            </div>
          )}
        </div>

        {filteredNotifications.length > 0 && (
          <div className="px-4 py-2 border-top border-bottom d-flex align-items-center gap-2">
            <input
              className="form-check-input mt-0"
              type="checkbox"
              id="selectAllNotifications"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              aria-label="Select all visible notifications"
            />
            <label
              htmlFor="selectAllNotifications"
              className="small text-muted mb-0"
            >
              Select all visible
            </label>
            <span className="small text-muted ms-auto">
              {filteredNotifications.length}{" "}
              {filteredNotifications.length === 1
                ? "notification"
                : "notifications"}
            </span>
          </div>
        )}

        <div className="list-group list-group-flush">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`list-group-item px-3 px-md-4 py-3 ${
                !notification.read ? "bg-lighter" : ""
              }`}
              style={{
                borderLeft: !notification.read
                  ? "3px solid #696cff"
                  : "3px solid transparent",
              }}
            >
              <div className="d-flex align-items-start gap-3">
                <input
                  className="form-check-input mt-3 flex-shrink-0"
                  type="checkbox"
                  checked={selectedIds.includes(notification.id)}
                  onChange={() => toggleSelected(notification.id)}
                  aria-label={`Select ${notification.title}`}
                />

                <NotificationIcon notification={notification} />

                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="d-flex flex-column flex-md-row justify-content-between gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                        <h6 className="mb-0">{notification.title}</h6>
                        {!notification.read && (
                          <span
                            className="badge bg-label-primary"
                            style={{ fontSize: 10 }}
                          >
                            NEW
                          </span>
                        )}
                      </div>

                      <p
                        className="mb-2 text-muted"
                        style={{ lineHeight: 1.6, overflowWrap: "anywhere" }}
                      >
                        {notification.description}
                      </p>

                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <NotificationBadge category={notification.category} />
                        <span className="text-muted small">
                          <i className="ri-time-line me-1" />
                          {notification.time}
                        </span>
                        {notification.user && (
                          <span className="text-muted small">
                            <i className="ri-user-line me-1" />
                            {notification.user}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="d-flex align-items-center align-self-start gap-1 flex-shrink-0">
                      <button
                        type="button"
                        className="btn btn-sm btn-icon btn-text-secondary rounded-pill"
                        title={
                          notification.read
                            ? "Mark as unread"
                            : "Mark as read"
                        }
                        aria-label={
                          notification.read
                            ? `Mark ${notification.title} as unread`
                            : `Mark ${notification.title} as read`
                        }
                        onClick={() =>
                          notification.read
                            ? markAsUnread(notification.id)
                            : markAsRead(notification.id)
                        }
                      >
                        <i
                          className={
                            notification.read
                              ? "ri-mail-unread-line"
                              : "ri-mail-check-line"
                          }
                        />
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-icon btn-text-secondary rounded-pill"
                        title="Delete notification"
                        aria-label={`Delete ${notification.title}`}
                        onClick={() =>
                          deleteNotification(notification.id)
                        }
                      >
                        <i className="ri-delete-bin-7-line" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredNotifications.length === 0 && (
            <div className="text-center px-4 py-5">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                style={{
                  width: 72,
                  height: 72,
                  background: "rgba(105,108,255,0.12)",
                  color: "#696cff",
                }}
              >
                <i
                  className={
                    search || activeFilter !== "all"
                      ? "ri-search-eye-line"
                      : "ri-notification-off-line"
                  }
                  style={{ fontSize: 32 }}
                />
              </div>
              <h5>
                {notifications.length === 0
                  ? "You're all caught up"
                  : "No notifications found"}
              </h5>
              <p className="text-muted mb-3">
                {notifications.length === 0
                  ? "New notifications will appear here when available."
                  : "Try another filter or search for a different notification."}
              </p>
              {(search || activeFilter !== "all") && (
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        <div className="card-footer d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
          <small className="text-muted">
            Demo data only. Backend integration will be added later.
          </small>
          <small className="text-muted">
            {unreadCount} unread of {notifications.length} total
          </small>
        </div>
      </div>

      {deleteTarget && (
        <div
          className="modal d-block"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deleteNotificationTitle"
          style={{ backgroundColor: "rgba(67,89,113,0.5)", zIndex: 1090 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
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
                <h5 id="deleteNotificationTitle">Delete notification?</h5>
                <p className="text-muted mb-4">
                  Are you sure you want to delete{" "}
                  <strong>{deleteTarget.title}</strong>?
                </p>
                <div className="d-flex justify-content-center gap-2">
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
                    Delete notification
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showClearReadConfirmation && (
        <div
          className="modal d-block"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clearReadTitle"
          style={{ backgroundColor: "rgba(67,89,113,0.5)", zIndex: 1090 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowClearReadConfirmation(false);
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center p-4">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                  style={{
                    width: 64,
                    height: 64,
                    background: "rgba(105,108,255,0.12)",
                    color: "#696cff",
                  }}
                >
                  <i
                    className="ri-notification-off-line"
                    style={{ fontSize: 28 }}
                  />
                </div>
                <h5 id="clearReadTitle">Clear read notifications?</h5>
                <p className="text-muted mb-4">
                  This will remove all {readCount} read notification
                  {readCount !== 1 ? "s" : ""}. Unread notifications will
                  remain.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-label-secondary"
                    onClick={() => setShowClearReadConfirmation(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={clearReadNotifications}
                  >
                    Clear read notifications
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
