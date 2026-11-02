"use client";

import React, { useEffect, useState } from "react";

const EMPTY_PROFILE = {
  fullName: "",
  email: "",
  phone: "",
  designation: "",
  department: "",
  timezone: "Asia/Kolkata",
  bio: "",
  businessName: "",
  businessCategory: "",
  chapterName: "",
  region: "",
  city: "",
  memberStatus: "",
  photoURL: "",
  role: "",
  isActive: false,
  createdAt: null,
  updatedAt: null,
};
export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [originalProfile, setOriginalProfile] = useState(EMPTY_PROFILE);

  const [passwords, setPasswords] = useState({
    current: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordMessage, setPasswordMessage] = useState("");


  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      try {
        const response = await fetch("/api/adminProfile", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to fetch profile."
          );
        }

        if (!cancelled) {
          setProfile({
            ...EMPTY_PROFILE,
            ...data.profile,
          });

          setOriginalProfile({
            ...EMPTY_PROFILE,
            ...data.profile,
          });
        }
      } catch (error) {
        if (!cancelled) {
          alert(error.message || "Unable to fetch profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateProfile = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));

    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch("/api/adminProfile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save profile.");
      }

      const updatedProfile = {
        ...EMPTY_PROFILE,
        ...data.profile,
      };

      setProfile(updatedProfile);
      setOriginalProfile(updatedProfile);
      setIsEditing(false);
      setSaved(true);
    } catch (error) {
      alert(error.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfile({ ...originalProfile });
    setIsEditing(false);
    setSaved(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordSuccess(true);
    setPasswordMessage(
      data.message || "Password updated successfully."
    );

    if (
      !passwords.current ||
      !passwords.newPassword ||
      !passwords.confirmPassword
    ) {
      setPasswordMessage("Please fill in all password fields.");
      return;
    }

    if (passwords.newPassword.length < 8) {
      setPasswordMessage(
        "New password must contain at least 8 characters."
      );
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMessage(
        "New password and confirmation do not match."
      );
      return;
    }

    try {
      const response = await fetch("/api/adminProfile/password", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwords),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to update password.");
      }

      setPasswordMessage(
        data.message || "Password updated successfully."
      );
      setPasswords({
        current: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setPasswordMessage(
        error.message || "Unable to update password."
      );
    }
  };

  const initials = profile.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const inputClass =
    "form-control" + (!isEditing ? " bg-lighter" : "");

  if (loading) {
    return (
      <div className="container-fluid flex-grow-1 container-p-y">
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-3">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid flex-grow-1 container-p-y">
      <style jsx>{`
        .profile-page {
          color: #6f6b7d;
          font-family: inherit;
        }

        .page-heading {
          color: #444050;
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.35rem;
        }

        .page-subtitle {
          color: #a5a3ae;
          font-size: 0.9375rem;
          margin-bottom: 0;
        }

        .profile-card {
          background: #fff;
          border: 0;
          border-radius: 0.5rem;
          box-shadow: 0 2px 6px 0 rgba(67, 89, 113, 0.12);
          overflow: hidden;
        }

        .profile-banner {
          height: 145px;
          background: linear-gradient(115deg, #696cff, #9395ff);
          position: relative;
        }

        .profile-banner::after {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0.16;
          background-image: radial-gradient(
            circle at 20% 20%,
            #ffffff 1px,
            transparent 1.5px
          );
          background-size: 22px 22px;
        }

        .profile-summary {
          padding: 0 1.5rem 1.5rem;
        }

        .avatar {
          width: 100px;
          height: 100px;
          min-width: 100px;
          border-radius: 50%;
          border: 5px solid #fff;
          background: #e8e7ff;
          color: #696cff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(67, 89, 113, 0.12);
          margin-top: -48px;
          position: relative;
          z-index: 1;
        }

        .profile-name {
          color: #444050;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.3rem;
        }

        .section-title {
          color: #444050;
          font-size: 1.0625rem;
          font-weight: 600;
          margin-bottom: 0.3rem;
        }

        .section-description {
          color: #a5a3ae;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }

        .form-label {
          color: #6f6b7d;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.45rem;
        }

        .form-control,
        .form-select {
          min-height: 42px;
          border-color: #dbdade;
          border-radius: 0.375rem;
          color: #6f6b7d;
          font-size: 0.9375rem;
          box-shadow: none;
        }

        .form-control:focus,
        .form-select:focus {
          border-color: #696cff;
          box-shadow: 0 0 0 0.15rem rgba(105, 108, 255, 0.16);
        }

        .bg-lighter {
          background-color: #f8f7fa;
        }

        .profile-icon {
          width: 42px;
          height: 42px;
          border-radius: 0.375rem;
          background: #eeeeff;
          color: #696cff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .info-label {
          color: #a5a3ae;
          font-size: 0.8125rem;
          margin-bottom: 0.25rem;
        }

        .info-value {
          color: #444050;
          font-size: 0.9375rem;
          font-weight: 500;
          overflow-wrap: anywhere;
        }

        .btn-primary {
          background: #696cff;
          border-color: #696cff;
        }

        .btn-primary:hover,
        .btn-primary:focus {
          background: #5f61e6;
          border-color: #5f61e6;
        }

        .btn-outline-primary {
          color: #696cff;
          border-color: #696cff;
        }

        .btn-outline-primary:hover {
          color: #fff;
          background: #696cff;
          border-color: #696cff;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          border-radius: 0.375rem;
          padding: 0.35rem 0.6rem;
          background: #e8fadf;
          color: #28c76f;
          font-size: 0.8125rem;
          font-weight: 500;
        }

        .security-note {
          background: #f8f7fa;
          border-radius: 0.375rem;
          padding: 0.85rem 1rem;
          font-size: 0.875rem;
        }

        .section-divider {
          border-top: 1px solid #eeedf0;
          margin: 1.5rem 0;
        }

        @media (max-width: 767px) {
          .profile-banner {
            height: 115px;
          }

          .profile-summary {
            padding: 0 1rem 1.25rem;
          }

          .avatar {
            width: 82px;
            height: 82px;
            min-width: 82px;
            font-size: 1.6rem;
            margin-top: -38px;
          }

          .profile-name {
            font-size: 1.1rem;
          }

          .profile-actions {
            width: 100%;
            margin-top: 1rem;
          }

          .profile-actions .btn {
            flex: 1;
          }
        }
      `}</style>

      <div className="profile-page">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">

          <div>
            <h4 className="fw-bold mb-1 ">
              My Profile
            </h4>
            <p className="text-muted mb-0">
              Manage your personal information and account security.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <i className="ri-home-4-line" />
            <span className="text-muted">/</span>
            <span className="text-muted">My Profile</span>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-12">
            <div className="profile-card">
              <div className="profile-banner" />

              <div className="profile-summary">
                <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
                  <div className="d-flex flex-wrap align-items-end gap-3">
                    <div className="avatar">{initials || "AU"}</div>

                    <div className="pb-1">
                      <h5 className="profile-name">{profile.fullName}</h5>
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <span>
                          <i className="ri-shield-user-line me-1" />
                          {profile.designation}
                        </span>
                        <span
                          className="status-badge"
                          style={
                            !profile.isActive
                              ? {
                                background: "#fce4e4",
                                color: "#ea5455",
                              }
                              : {}
                          }
                        >
                          <i
                            className={
                              profile.isActive
                                ? "ri-checkbox-circle-fill"
                                : "ri-close-circle-fill"
                            }
                          />
                          {profile.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-2 profile-actions">
                    {!isEditing ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          setSaved(false);
                          setIsEditing(true);
                        }}
                      >
                        <i className="ri-edit-line me-1" />
                        Edit Profile
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleSave}
                          disabled={saving}
                        >
                          <i className="ri-save-line me-1" />
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {saved && (
                  <div
                    className="alert alert-success mt-3 mb-0 py-2"
                    role="status"
                  >
                    <i className="ri-checkbox-circle-line me-2" />
                    Profile updated successfully.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-8">
            <div className="profile-card p-4">
              <div className="d-flex align-items-start gap-3 mb-4">
                <div className="profile-icon">
                  <i className="ri-user-line" />
                </div>
                <div>
                  <h5 className="section-title">Personal Information</h5>
                  <p className="section-description mb-0">
                    Your profile details and contact information.
                  </p>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={profile.fullName}
                    readOnly={!isEditing}
                    onChange={(e) =>
                      updateProfile("fullName", e.target.value)
                    }
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={profile.email}
                    readOnly={!isEditing}
                    onChange={(e) => updateProfile("email", e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className={inputClass}
                    value={profile.phone}
                    readOnly={!isEditing}
                    onChange={(e) => updateProfile("phone", e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Designation</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={profile.designation}
                    readOnly={!isEditing}
                    onChange={(e) =>
                      updateProfile("designation", e.target.value)
                    }
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={profile.department}
                    readOnly={!isEditing}
                    onChange={(e) =>
                      updateProfile("department", e.target.value)
                    }
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Timezone</label>
                  <select
                    className="form-select"
                    value={profile.timezone}
                    disabled={!isEditing}
                    onChange={(e) =>
                      updateProfile("timezone", e.target.value)
                    }
                  >
                    <option value="Asia/Kolkata">
                      India Standard Time (IST)
                    </option>
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                    <option value="America/New_York">
                      Eastern Time (ET)
                    </option>
                    <option value="Europe/London">
                      United Kingdom (GMT/BST)
                    </option>
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label">About</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={profile.bio}
                    readOnly={!isEditing}
                    onChange={(e) => updateProfile("bio", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="profile-card p-4 mb-4">
              <div className="d-flex align-items-start gap-3 mb-4">
                <div className="profile-icon">
                  <i className="ri-shield-check-line" />
                </div>
                <div>
                  <h5 className="section-title">Account Information</h5>
                  <p className="section-description mb-0">
                    Your administrator account details.
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3 mb-4">
                <i className="ri-user-settings-line fs-4 text-primary" />
                <div>
                  <div className="info-label">Account Role</div>
                  <div className="info-value">
                    {profile.role || "Admin"}
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3 mb-4">
                <i className="ri-checkbox-circle-line fs-4 text-success" />
                <div>
                  <div className="info-label">Account Status</div>
                  <div className="info-value">
                    {profile.isActive ? "Active" : "Inactive"}
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3 mb-4">
                <i className="ri-calendar-check-line fs-4 text-primary" />
                <div>
                  <div className="info-label">Member Since</div>
                  <div className="info-value">
                    {profile.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                      })
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3">
                <i className="ri-time-line fs-4 text-primary" />
                <div>
                  <div className="info-label">Last Login</div>
                  <div className="info-value">Today</div>
                </div>
              </div>
            </div>

            <div className="profile-card p-4">
              <div className="d-flex align-items-start gap-3 mb-3">
                <div className="profile-icon">
                  <i className="ri-lock-password-line" />
                </div>
                <div>
                  <h5 className="section-title">Password</h5>
                  <p className="section-description mb-0">
                    Keep your account secure.
                  </p>
                </div>
              </div>

              <div className="security-note mb-3">
                <i className="ri-information-line me-2 text-primary" />
                Use a strong password with at least 8 characters.
              </div>

              <form onSubmit={handlePasswordChange}>
                <div className="mb-3">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="form-control"
                    autoComplete="current-password"
                    value={passwords.current}
                    onChange={(e) =>
                      setPasswords((prev) => ({
                        ...prev,
                        current: e.target.value,
                      }))
                    }
                    placeholder="Enter current password"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    autoComplete="new-password"
                    value={passwords.newPassword}
                    onChange={(e) =>
                      setPasswords((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter new password"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    autoComplete="new-password"
                    value={passwords.confirmPassword}
                    onChange={(e) =>
                      setPasswords((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Confirm new password"
                  />
                </div>

                {passwordMessage && (
                  <div
                    className={`alert ${passwordSuccess ? "alert-success" : "alert-danger"
                      } py-2`}
                    role="status"
                  >
                    {passwordMessage}
                  </div>
                )}

                <button type="submit" className="btn btn-primary w-100">
                  <i className="ri-lock-password-line me-1" />
                  Update Password
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}