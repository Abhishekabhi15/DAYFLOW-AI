import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authApi, attendanceApi } from "../services/api";
import StatusBadge from "../components/StatusBadge";

const verifiedDocuments = [
  { id: 1, name: "Employment Agreement", type: "Official Contract", status: "Verified" },
  { id: 2, name: "Government ID Proof", type: "Identity Verification", status: "Verified" },
  { id: 3, name: "Educational Certificates", type: "Academic Verification", status: "Verified" },
];

function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatDate(dateValue) {
  if (!dateValue) return "Not available";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateValue) {
  if (!dateValue) return "--:--";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Profile() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(user || {});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  // Editable fields state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name || "");
  const [editPhone, setEditPhone] = useState(profile.phone || "");
  const [editAddress, setEditAddress] = useState(profile.address || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Attendance state
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const showMessage = (type, text) => {
    setMessageType(type);
    setMessage(text);
    setTimeout(() => {
      setMessage("");
    }, 3500);
  };

  const loadProfileData = async () => {
    setLoading(true);

    try {
      const meData = await authApi.getMe();
      if (meData && meData.user) {
        setProfile(meData.user);
        setEditName(meData.user.name || "");
        setEditPhone(meData.user.phone || "");
        setEditAddress(meData.user.address || "");
      } else if (user) {
        setProfile(user);
        setEditName(user.name || "");
        setEditPhone(user.phone || "");
        setEditAddress(user.address || "");
      }

      const attendanceData = await attendanceApi.getAttendance();
      const list = Array.isArray(attendanceData) ? attendanceData : [];
      setAttendanceHistory(list);

      const today = new Date();
      const todayMatch = list.find((rec) => isSameDay(rec.date, today));
      setTodayAttendance(todayMatch || null);
    } catch (error) {
      showMessage("danger", error.message || "Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const handleSaveContactInfo = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const result = await authApi.updateProfile({
        name: editName,
        phone: editPhone,
        address: editAddress,
      });
      if (result && result.user) {
        setProfile(result.user);
      } else {
        setProfile((prev) => ({ ...prev, name: editName, phone: editPhone, address: editAddress }));
      }
      setIsEditing(false);
      refreshUser();
      showMessage("success", "Profile details updated successfully!");
    } catch (err) {
      showMessage("danger", err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const result = await attendanceApi.checkIn();
      setTodayAttendance(result);
      showMessage("success", "Checked in successfully for today!");
      loadProfileData();
    } catch (err) {
      showMessage("danger", err.message || "Failed to check in.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const result = await attendanceApi.checkOut();
      setTodayAttendance(result);
      showMessage("success", "Checked out successfully for today!");
      loadProfileData();
    } catch (err) {
      showMessage("danger", err.message || "Failed to check out.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state-box py-5">
        <div className="spinner-border text-secondary mb-3" role="status"></div>
        <p className="mb-0">Loading employee profile...</p>
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 className="h4 fw-bold mb-1 section-title">Profile Management</h2>
          <p className="text-muted mb-0 mt-1">
            View verified personnel credentials, address details, and account preferences.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm px-3 d-flex align-items-center gap-1"
          onClick={loadProfileData}
        >
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {/* Alert */}
      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show mb-4`} role="alert">
          {message}
          <button
            type="button"
            className="btn-close ms-auto"
            onClick={() => setMessage("")}
            aria-label="Close"
          />
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-4 flex-wrap">
            {/* Avatar Badge */}
            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold fs-3 shadow-sm"
              style={{
                width: "72px",
                height: "72px",
                backgroundColor: "var(--accent-gold-subtle)",
                color: "var(--accent-gold)",
                border: "2px solid var(--accent-gold)",
              }}
            >
              {getInitials(profile.name)}
            </div>

            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                <h3 className="h4 fw-bold mb-0">{profile.name || "User Profile"}</h3>
                <StatusBadge status={profile.status || "Active"} />
                <span className="user-role-tag">
                  {profile.role === "Admin" ? "Manager" : profile.role === "HR Officer" ? "HR" : "Employee"}
                </span>
                {profile.approvalStatus && (
                  <StatusBadge status={profile.approvalStatus} />
                )}
              </div>
              <p className="text-muted mb-0">
                {profile.designation || "Staff"} &bull; {profile.department || "General"}
              </p>
            </div>
          </div>

          <hr className="my-4" style={{ borderColor: "var(--border-color)" }} />

          <div className="row g-3">
            <div className="col-6 col-md-3">
              <small className="text-muted d-block">Employee ID</small>
              <strong className="font-monospace fs-6">{profile.employeeId || "--"}</strong>
            </div>
            <div className="col-6 col-md-3">
              <small className="text-muted d-block">Work Email</small>
              <strong className="text-break">{profile.email || "--"}</strong>
            </div>
            <div className="col-6 col-md-3">
              <small className="text-muted d-block">Department</small>
              <strong>{profile.department || "General"}</strong>
            </div>
            <div className="col-6 col-md-3">
              <small className="text-muted d-block">Joining Date</small>
              <strong>{formatDate(profile.joiningDate || profile.createdAt)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Contact & Personal Information */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header py-3 d-flex justify-content-between align-items-center">
              <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-person-lines-fill text-primary"></i>
                Personal Contact Information
              </h5>

              {!isEditing && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setIsEditing(true)}
                >
                  <i className="bi bi-pencil me-1"></i> Edit
                </button>
              )}
            </div>

            <div className="card-body">
              {isEditing ? (
                <form onSubmit={handleSaveContactInfo}>
                  <div className="mb-3">
                    <label htmlFor="editName" className="form-label fw-semibold small">
                      Full Name
                    </label>
                    <input
                      id="editName"
                      type="text"
                      className="form-control"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="editPhone" className="form-label fw-semibold small">
                      Phone Number
                    </label>
                    <input
                      id="editPhone"
                      type="tel"
                      className="form-control"
                      placeholder="+1 (555) 000-0000"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="editAddress" className="form-label fw-semibold small">
                      Residential Address
                    </label>
                    <textarea
                      id="editAddress"
                      className="form-control"
                      rows="3"
                      placeholder="Street address, city, zip code..."
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm px-3 fw-bold"
                      disabled={savingProfile}
                    >
                      {savingProfile ? "Saving..." : "Save Details"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm px-3"
                      onClick={() => {
                        setEditName(profile.name || "");
                        setEditPhone(profile.phone || "");
                        setEditAddress(profile.address || "");
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <table className="table table-borderless mb-0">
                  <tbody>
                    <tr>
                      <th className="text-muted ps-0" style={{ width: "120px" }}>
                        Full Name
                      </th>
                      <td className="fw-semibold">{profile.name}</td>
                    </tr>
                    <tr>
                      <th className="text-muted ps-0">Work Email</th>
                      <td>{profile.email}</td>
                    </tr>
                    <tr>
                      <th className="text-muted ps-0">Role</th>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {profile.role === "Admin" ? "Manager" : profile.role}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <th className="text-muted ps-0">Phone</th>
                      <td>{profile.phone || "Not specified (Click Edit)"}</td>
                    </tr>
                    <tr>
                      <th className="text-muted ps-0">Address</th>
                      <td>{profile.address || "Not specified (Click Edit)"}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Verified Documents */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header py-3">
              <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-file-earmark-check text-primary"></i>
                Verified Documents
              </h5>
            </div>

            <div className="card-body">
              <div className="list-group list-group-flush">
                {verifiedDocuments.map((doc) => (
                  <div
                    className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-bottom"
                    key={doc.id}
                  >
                    <div>
                      <strong className="d-block small">{doc.name}</strong>
                      <small className="text-muted">{doc.type}</small>
                    </div>
                    <span className="badge-status badge-status-approved">
                      <i className="bi bi-check-circle-fill"></i> {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today Attendance Session Status */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-clock text-primary"></i>
            Today's Session Activity
          </h5>
          <span className="text-muted small">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        <div className="card-body p-4">
          <div className="row g-3 align-items-center">
            <div className="col-md-3">
              <small className="text-muted d-block">Status</small>
              <div className="mt-1">
                <StatusBadge
                  status={
                    todayAttendance?.checkOut
                      ? "Completed"
                      : todayAttendance?.checkIn
                        ? "Present"
                        : "Not Checked In"
                  }
                />
              </div>
            </div>
            <div className="col-md-3">
              <small className="text-muted d-block">Check-In</small>
              <strong className="font-monospace fs-6">
                {todayAttendance?.checkIn ? formatTime(todayAttendance.checkIn) : "--:--"}
              </strong>
            </div>
            <div className="col-md-3">
              <small className="text-muted d-block">Check-Out</small>
              <strong className="font-monospace fs-6">
                {todayAttendance?.checkOut ? formatTime(todayAttendance.checkOut) : "--:--"}
              </strong>
            </div>
            <div className="col-md-3">
              {!todayAttendance ? (
                <button
                  type="button"
                  className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                >
                  <i className="bi bi-box-arrow-in-right"></i> Check In
                </button>
              ) : !todayAttendance.checkOut ? (
                <button
                  type="button"
                  className="btn btn-gold w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                >
                  <i className="bi bi-box-arrow-right"></i> Check Out
                </button>
              ) : (
                <button type="button" className="btn btn-outline-secondary w-100 py-2" disabled>
                  <i className="bi bi-check2-all me-1"></i> Completed
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
