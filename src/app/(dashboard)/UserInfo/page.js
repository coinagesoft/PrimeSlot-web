
"use client";

import { useMemo, useState } from "react";

const INITIAL_USERS = [
  {
    id: 1,
    name: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    phone: "+91 98765 43210",
    role: "Admin",
    status: "Active",
    joined: "12 Oct 2026",
    avatar: "RS",
  },
  {
    id: 2,
    name: "Priya Patil",
    email: "priya.patil@example.com",
    phone: "+91 87654 32109",
    role: "Member",
    status: "Active",
    joined: "10 Oct 2026",
    avatar: "PP",
  },
  {
    id: 3,
    name: "Amit Deshmukh",
    email: "amit.deshmukh@example.com",
    phone: "+91 99887 76655",
    role: "Member",
    status: "Inactive",
    joined: "08 Oct 2026",
    avatar: "AD",
  },
  {
    id: 4,
    name: "Sneha Kulkarni",
    email: "sneha.kulkarni@example.com",
    phone: "+91 90909 80808",
    role: "Moderator",
    status: "Active",
    joined: "05 Oct 2026",
    avatar: "SK",
  },
  {
    id: 5,
    name: "Karan Joshi",
    email: "karan.joshi@example.com",
    phone: "+91 88776 65544",
    role: "Member",
    status: "Pending",
    joined: "02 Oct 2026",
    avatar: "KJ",
  },
  {
    id: 6,
    name: "Neha More",
    email: "neha.more@example.com",
    phone: "+91 77665 54433",
    role: "Member",
    status: "Active",
    joined: "28 Sep 2026",
    avatar: "NM",
  },
];

const ROLE_STYLES = {
  Admin: "bg-label-primary",
  Moderator: "bg-label-info",
  Member: "bg-label-secondary",
};

const STATUS_STYLES = {
  Active: "bg-label-success",
  Inactive: "bg-label-secondary",
  Pending: "bg-label-warning",
};

const PRIMARY_COLOR = "#696cff";

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function UserAvatar({ name, avatar, size = "md" }) {
  const colors = [
    "bg-label-primary",
    "bg-label-info",
    "bg-label-success",
    "bg-label-warning",
    "bg-label-danger",
  ];

  const colorIndex =
    Math.abs(
      name
        .split("")
        .reduce((total, character) => total + character.charCodeAt(0), 0)
    ) % colors.length;

  return (
    <div className={`avatar flex-shrink-0 ${size === "lg" ? "avatar-lg" : ""}`}>
      <span
        className={`avatar-initial rounded-circle ${colors[colorIndex]}`}
        style={{
          width: size === "lg" ? 56 : 40,
          height: size === "lg" ? 56 : 40,
          fontSize: size === "lg" ? 18 : 14,
          fontWeight: 600,
        }}
      >
        {avatar || getInitials(name)}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_STYLES[status] || "bg-label-secondary"}`}>
      {status}
    </span>
  );
}

function RoleBadge({ role }) {
  return (
    <span className={`badge ${ROLE_STYLES[role] || "bg-label-secondary"}`}>
      {role}
    </span>
  );
}

function StatCard({ title, value, description, icon, tone }) {
  return (
    <div className="col-6 col-xl-3">
      <div className="card h-100 user-info-stat-card">
        <div className="card-body d-flex align-items-center justify-content-between gap-2">
          <div className="min-w-0">
            <span className="text-muted d-block mb-1 user-info-muted">
              {title}
            </span>
            <h3 className="mb-1 fw-semibold user-info-stat-value">{value}</h3>
            <small className="text-muted user-info-muted">{description}</small>
          </div>

          <div className={`user-info-stat-icon ${tone}`}>
            <i className={`${icon}`} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

function UserModal({
  form,
  setForm,
  editingUser,
  onClose,
  onSave,
}) {
  return (
    <div
      className="ui-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="ui-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
      >
        <form onSubmit={onSave}>
          <div className="ui-modal-header">
            <div>
              <h5 className="mb-1 fw-semibold" id="user-form-title">
                {editingUser ? "Edit User" : "Add New User"}
              </h5>
              <p className="text-muted mb-0 user-info-muted">
                Enter the user&apos;s basic account information.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-icon btn-text-secondary rounded-pill"
              onClick={onClose}
              aria-label="Close modal"
            >
              <i className="ri-close-line fs-4" />
            </button>
          </div>

          <div className="ui-modal-body">
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label" htmlFor="user-name">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  id="user-name"
                  type="text"
                  className="form-control"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Enter full name"
                  autoComplete="name"
                  required
                  autoFocus
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="user-email">
                  Email Address <span className="text-danger">*</span>
                </label>
                <input
                  id="user-email"
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="user-phone">
                  Phone Number
                </label>
                <input
                  id="user-phone"
                  type="tel"
                  className="form-control"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="user-role">
                  Role
                </label>
                <select
                  id="user-role"
                  className="form-select"
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                >
                  <option value="Member">Member</option>
                  <option value="Moderator">Moderator</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="user-status">
                  Account Status
                </label>
                <select
                  id="user-status"
                  className="form-select"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          <div className="ui-modal-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <i className="ri-save-line me-2" />
              {editingUser ? "Save Changes" : "Add User"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function UserDetailsModal({ user, onClose, onEdit }) {
  return (
    <div
      className="ui-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="ui-modal-dialog ui-modal-dialog-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-details-title"
      >
        <div className="ui-modal-header">
          <h5 className="mb-0 fw-semibold" id="user-details-title">
            User Profile
          </h5>
          <button
            type="button"
            className="btn btn-icon btn-text-secondary rounded-pill"
            onClick={onClose}
            aria-label="Close modal"
          >
            <i className="ri-close-line fs-4" />
          </button>
        </div>

        <div className="ui-modal-body">
          <div className="text-center pb-4 border-bottom">
            <div className="d-flex justify-content-center mb-3">
              <UserAvatar
                name={user.name}
                avatar={user.avatar}
                size="lg"
              />
            </div>
            <h5 className="mb-1 fw-semibold">{user.name}</h5>
            <p className="text-muted mb-3 user-info-muted">{user.email}</p>
            <div className="d-flex justify-content-center flex-wrap gap-2">
              <RoleBadge role={user.role} />
              <StatusBadge status={user.status} />
            </div>
          </div>

          <div className="pt-3">
            <div className="ui-user-detail-row">
              <span className="text-muted">User ID</span>
              <span className="fw-medium">#{user.id}</span>
            </div>
            <div className="ui-user-detail-row">
              <span className="text-muted">Phone</span>
              <span className="fw-medium text-end">
                {user.phone || "Not provided"}
              </span>
            </div>
            <div className="ui-user-detail-row">
              <span className="text-muted">Joined Date</span>
              <span className="fw-medium">{user.joined}</span>
            </div>
          </div>
        </div>

        <div className="ui-modal-footer">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onClose}
          >
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={onEdit}>
            <i className="ri-edit-line me-2" />
            Edit User
          </button>
        </div>
      </section>
    </div>
  );
}

function DeleteUserModal({ user, onClose, onConfirm }) {
  return (
    <div
      className="ui-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="ui-modal-dialog ui-modal-dialog-delete"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-user-title"
      >
        <div className="text-center p-4 p-sm-5">
          <div className="ui-delete-icon mx-auto mb-3">
            <i className="ri-delete-bin-line" />
          </div>
          <h5 className="fw-semibold mb-2" id="delete-user-title">
            Delete User?
          </h5>
          <p className="text-muted mb-4">
            Are you sure you want to remove <strong>{user.name}</strong> from
            this demo list?
          </p>
          <div className="d-flex justify-content-center flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onConfirm}
            >
              <i className="ri-delete-bin-line me-1" />
              Delete
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}




export default function UserInfoPage() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Member",
    status: "Active",
  });

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === "Active").length,
      inactive: users.filter((user) => user.status === "Inactive").length,
      admins: users.filter((user) => user.role === "Admin").length,
    }),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        [user.name, user.email, user.phone, user.role].some((value) =>
          value.toLowerCase().includes(query)
        );

      return (
        matchesSearch &&
        (roleFilter === "All" || user.role === roleFilter) &&
        (statusFilter === "All" || user.status === statusFilter)
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      phone: "",
      role: "Member",
      status: "Active",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingUser(null);
    setShowCreateModal(true);
  };

  const openEditModal = (user) => {
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    });
    setEditingUser(user);
    setShowCreateModal(true);
  };

  const handleSaveUser = (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name || !email) {
      setNotice("Name and email are required.");
      return;
    }

    const duplicateEmail = users.some(
      (user) =>
        user.email.toLowerCase() === email.toLowerCase() &&
        user.id !== editingUser?.id
    );

    if (duplicateEmail) {
      setNotice("A user with this email address already exists.");
      return;
    }

    if (editingUser) {
      setUsers((current) =>
        current.map((user) =>
          user.id === editingUser.id
            ? {
                ...user,
                ...form,
                name,
                email,
                phone: form.phone.trim(),
                avatar: getInitials(name),
              }
            : user
        )
      );
      setNotice("User updated in demo data.");
    } else {
      const newUser = {
        id: Math.max(0, ...users.map((user) => user.id)) + 1,
        ...form,
        name,
        email,
        phone: form.phone.trim(),
        joined: new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        avatar: getInitials(name),
      };

      setUsers((current) => [newUser, ...current]);
      setNotice("User added to demo data.");
    }

    setShowCreateModal(false);
    setEditingUser(null);
    resetForm();
  };

  const handleDeleteUser = () => {
    if (!showDeleteModal) return;

    setUsers((current) =>
      current.filter((user) => user.id !== showDeleteModal.id)
    );

    if (selectedUser?.id === showDeleteModal.id) {
      setSelectedUser(null);
    }

    setNotice("User removed from demo data.");
    setShowDeleteModal(null);
  };

  const currentAdmin = users.find((user) => user.role === "Admin") || users[0];

  const handleSaveProfile = (updatedProfile) => {
    const duplicateEmail = users.some(
      (user) =>
        user.id !== updatedProfile.id &&
        user.email.toLowerCase() === updatedProfile.email.toLowerCase()
    );
    if (duplicateEmail) {
      setNotice("A user with this email address already exists.");
      return;
    }

    setUsers((current) =>
      current.map((user) => user.id === updatedProfile.id ? updatedProfile : user)
    );
    setNotice("Profile updated. Changes are reflected in User Info.");
    setShowProfileModal(false);
  };

  const closeNotice = () => setNotice("");

  return (
    <>
      <style jsx global>{`
        .user-info-page {
          --ui-primary: ${PRIMARY_COLOR};
          --ui-radius: 0.625rem;
          --ui-text: #38415a;
          color: var(--ui-text);
          font-size: 0.9375rem;
        }

        .user-info-page,
        .user-info-page *,
        .ui-modal-backdrop,
        .ui-modal-backdrop * {
          box-sizing: border-box;
        }

        .user-info-page h4 {
          font-size: 1.375rem;
          line-height: 1.4;
          letter-spacing: 0;
        }

        .user-info-page h5 {
          font-size: 1.0625rem;
          line-height: 1.4;
        }

        .user-info-page .user-info-muted {
          font-size: 0.8125rem;
          line-height: 1.5;
        }

        .user-info-page .card {
          border-radius: var(--ui-radius);
          box-shadow: 0 2px 6px 0 rgba(67, 89, 113, 0.08);
          overflow: hidden;
        }

        .user-info-page .card-header {
          padding: 1.125rem 1.25rem;
        }

        .user-info-page .card-body {
          padding: 1.25rem;
        }

        .user-info-page .card-footer {
          padding: 0.875rem 1.25rem;
          background: transparent;
        }

        .user-info-page .form-label {
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.4375rem;
        }

        .user-info-page .form-control,
        .user-info-page .form-select,
        .user-info-page .input-group-text {
          min-height: 42px;
          font-size: 0.875rem;
          border-radius: 0.5rem;
        }

        .user-info-page .input-group .input-group-text {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }

        .user-info-page .input-group .form-control {
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        }

        .user-info-page .form-control:focus,
        .user-info-page .form-select:focus {
          border-color: var(--ui-primary);
          box-shadow: 0 0 0 0.15rem rgba(105, 108, 255, 0.15);
        }

        .user-info-page .btn {
          min-height: 38px;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 0.5rem;
          padding: 0.5rem 0.875rem;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 0.25rem;
          white-space: nowrap;
        }

        .user-info-page .btn-primary {
          background: var(--ui-primary);
          border-color: var(--ui-primary);
        }

        .user-info-page .btn-primary:hover {
          background: #5f62e6;
          border-color: #5f62e6;
        }

        .user-info-page .btn-icon {
          width: 36px;
          min-width: 36px;
          height: 36px;
          min-height: 36px;
          padding: 0;
        }

        .user-info-page .badge {
          font-size: 0.75rem;
          font-weight: 500;
          line-height: 1.3;
          padding: 0.35rem 0.55rem;
          border-radius: 0.375rem;
        }

        .user-info-page .table {
          font-size: 0.875rem;
        }

        .user-info-page .table > :not(caption) > * > * {
          padding: 0.875rem 1rem;
          vertical-align: middle;
        }

        .user-info-page .table thead th {
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.025em;
          white-space: nowrap;
        }

        .user-info-page .table tbody td {
          line-height: 1.45;
        }

        .user-info-stat-card {
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .user-info-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 14px rgba(67, 89, 113, 0.12);
        }

        .user-info-stat-value {
          font-size: 1.625rem;
          line-height: 1.2;
        }

        .user-info-stat-icon {
          width: 46px;
          height: 46px;
          min-width: 46px;
          border-radius: 0.625rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.375rem;
        }

        .user-info-stat-icon.primary {
          color: #696cff;
          background: rgba(105, 108, 255, 0.14);
        }

        .user-info-stat-icon.success {
          color: #71dd37;
          background: rgba(113, 221, 55, 0.15);
        }

        .user-info-stat-icon.secondary {
          color: #8592a3;
          background: rgba(133, 146, 163, 0.15);
        }

        .user-info-stat-icon.warning {
          color: #ffab00;
          background: rgba(255, 171, 0, 0.15);
        }

        .ui-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 20000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
          overflow-y: auto;
          background: rgba(40, 50, 70, 0.55);
          isolation: isolate;
          -webkit-overflow-scrolling: touch;
        }

        .ui-modal-dialog {
          position: relative;
          width: 100%;
          max-width: 820px;
          max-height: calc(100dvh - 2.5rem);
          margin: auto;
          overflow-y: auto;
          background: #fff;
          color: #38415a;
          border-radius: 0.75rem;
          box-shadow: 0 1rem 3rem rgba(34, 41, 47, 0.24);
          animation: ui-modal-appear 0.16s ease-out;
        }

        .ui-modal-dialog-sm {
          max-width: 500px;
        }

        .ui-modal-dialog-delete {
          max-width: 400px;
        }

        .ui-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e7eaf0;
        }

        .ui-modal-body {
          padding: 1.5rem;
        }

        .ui-modal-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.625rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e7eaf0;
        }

        .ui-user-detail-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.75rem 0;
          font-size: 0.875rem;
        }

        .ui-delete-icon {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255, 62, 29, 0.12);
          color: #ff3e1d;
          font-size: 1.75rem;
        }

        @keyframes ui-modal-appear {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 767.98px) {
          .user-info-page .card-header,
          .user-info-page .card-body {
            padding: 1rem;
          }

          .user-info-stat-value {
            font-size: 1.375rem;
          }

          .user-info-stat-icon {
            width: 38px;
            height: 38px;
            min-width: 38px;
            font-size: 1.125rem;
          }

          .ui-modal-backdrop {
            align-items: center;
            padding: 0.75rem;
          }

          .ui-modal-dialog {
            max-height: calc(100dvh - 1.5rem);
            border-radius: 0.625rem;
          }

          .ui-modal-header {
            padding: 1rem;
          }

          .ui-modal-body {
            padding: 1rem;
          }

          .ui-modal-footer {
            padding: 1rem;
          }

          .user-info-page .table > :not(caption) > * > * {
            padding: 0.75rem;
          }
        }

        @media (max-width: 420px) {
          .user-info-page h4 {
            font-size: 1.2rem;
          }

          .user-info-page .user-info-stat-icon {
            display: none;
          }

          .ui-modal-footer > .btn {
            flex: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .user-info-stat-card,
          .ui-modal-dialog {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <main className="container-xxl flex-grow-1 container-p-y user-info-page">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
         
           <div>
          <h4 className="fw-bold mb-1 ">
            Members Info
          </h4>
          <p className="text-muted mb-0">
             Manage user profiles, roles, and account status.
          </p>
        </div>

          <div className="d-flex flex-wrap gap-2">
          
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateModal}
            >
              <i className="ri-user-add-line" aria-hidden="true" />
              Add User
            </button>
          </div>
        </div>

        {notice && (
          <div
            className="alert alert-primary alert-dismissible d-flex align-items-start gap-2 mb-4"
            role="status"
          >
            <i className="ri-information-line fs-5" aria-hidden="true" />
            <div className="flex-grow-1">{notice}</div>
            <button
              type="button"
              className="btn-close"
              onClick={closeNotice}
              aria-label="Close notification"
            />
          </div>
        )}

        

        <div className="row g-3 g-xl-4 mb-4">
          <StatCard
            title="Total Users"
            value={stats.total}
            description="Registered accounts"
            icon="ri-group-line"
            tone="primary"
          />
          <StatCard
            title="Active Users"
            value={stats.active}
            description="Active accounts"
            icon="ri-user-follow-line"
            tone="success"
          />
          <StatCard
            title="Inactive Users"
            value={stats.inactive}
            description="Inactive accounts"
            icon="ri-user-unfollow-line"
            tone="secondary"
          />
          <StatCard
            title="Administrators"
            value={stats.admins}
            description="Admin accounts"
            icon="ri-shield-user-line"
            tone="warning"
          />
        </div>

        <div className="card">
          <div className="card-header border-bottom">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <h5 className="mb-1 fw-semibold">All Users</h5>
                <small className="text-muted user-info-muted">
                  Browse and manage registered users
                </small>
              </div>

              <span className="badge bg-label-primary">
                {filteredUsers.length} result
                {filteredUsers.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="card-body border-bottom">
            <div className="row g-3 align-items-end">
              <div className="col-12 col-lg-5">
                <label className="form-label" htmlFor="user-search">
                  Search users
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="ri-search-line" aria-hidden="true" />
                  </span>
                  <input
                    id="user-search"
                    type="search"
                    className="form-control"
                    placeholder="Search name, email, phone or role..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>

              <div className="col-6 col-lg-3">
                <label className="form-label" htmlFor="role-filter">
                  Role
                </label>
                <select
                  id="role-filter"
                  className="form-select"
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                >
                  <option value="All">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Moderator">Moderator</option>
                  <option value="Member">Member</option>
                </select>
              </div>

              <div className="col-6 col-lg-3">
                <label className="form-label" htmlFor="status-filter">
                  Status
                </label>
                <select
                  id="status-filter"
                  className="form-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="col-12 col-lg-1">
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100"
                  title="Reset filters"
                  aria-label="Reset filters"
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("All");
                    setStatusFilter("All");
                  }}
                >
                  <i className="ri-refresh-line" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <UserAvatar name={user.name} avatar={user.avatar} />
                        <div className="min-w-0">
                          <div className="fw-semibold">{user.name}</div>
                          <small className="text-muted user-info-muted">
                            ID: {user.id}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div>{user.email}</div>
                      <small className="text-muted user-info-muted">
                        {user.phone || "No phone added"}
                      </small>
                    </td>

                    <td>
                      <RoleBadge role={user.role} />
                    </td>

                    <td>
                      <StatusBadge status={user.status} />
                    </td>

                    <td className="text-nowrap">{user.joined}</td>

                    <td>
                      <div className="d-flex justify-content-end align-items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-icon btn-text-secondary rounded-pill"
                          title="View user"
                          aria-label={`View ${user.name}`}
                          onClick={() => setSelectedUser(user)}
                        >
                          <i className="ri-eye-line fs-5" aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          className="btn btn-icon btn-text-secondary rounded-pill"
                          title="Edit user"
                          aria-label={`Edit ${user.name}`}
                          onClick={() => openEditModal(user)}
                        >
                          <i className="ri-edit-line fs-5" aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          className="btn btn-icon btn-text-danger rounded-pill"
                          title="Delete user"
                          aria-label={`Delete ${user.name}`}
                          onClick={() => setShowDeleteModal(user)}
                        >
                          <i
                            className="ri-delete-bin-line fs-5"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <i
                        className="ri-user-search-line fs-1 text-muted d-block mb-2"
                        aria-hidden="true"
                      />
                      <h6 className="mb-1 fw-semibold">No users found</h6>
                      <p className="text-muted user-info-muted mb-0">
                        Try changing your search or filter options.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card-footer d-flex flex-wrap justify-content-between align-items-center gap-2">
            <small className="text-muted user-info-muted">
              Showing {filteredUsers.length} of {users.length} users
            </small>
            <small className="text-muted user-info-muted">
              <i className="ri-database-2-line me-1" aria-hidden="true" />
              Sample data
            </small>
          </div>
        </div>
      </main>

      {showProfileModal && currentAdmin && (
        <MyProfileModal
          user={currentAdmin}
          onClose={() => setShowProfileModal(false)}
          onSave={handleSaveProfile}
          onPasswordChange={() => setNotice("Password change checked in demo mode; no password was changed on the server.")}
        />
      )}

      {showCreateModal && (
        <UserModal
          form={form}
          setForm={setForm}
          editingUser={editingUser}
          onClose={() => {
            setShowCreateModal(false);
            setEditingUser(null);
          }}
          onSave={handleSaveUser}
        />
      )}

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onEdit={() => {
            const user = selectedUser;
            setSelectedUser(null);
            openEditModal(user);
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteUserModal
          user={showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          onConfirm={handleDeleteUser}
        />
      )}
    </>
  );
}
