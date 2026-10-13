import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { attendanceApi } from "../services/api";
import StatusBadge from "../components/StatusBadge";

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

function isTodayRecord(record) {
  if (!record) return false;
  const now = new Date();
  if (record.checkIn && isSameDay(record.checkIn, now)) return true;
  if (record.createdAt && isSameDay(record.createdAt, now)) return true;
  if (record.date && isSameDay(record.date, now)) return true;
  return false;
}

export function Attendance() {
  const { user } = useAuth();
  const isAdminOrHR = user?.role === "Admin" || user?.role === "HR Officer";

  const [records, setRecords] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [todayRecord, setTodayRecord] = useState(null);

  const fetchAttendanceRecords = async (filter = statusFilter) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [data, todayData] = await Promise.all([
        attendanceApi.getAttendance(filter),
        attendanceApi.getTodayAttendance().catch(() => null),
      ]);
      const list = Array.isArray(data) ? data : [];
      setRecords(list);
      setTodayRecord(todayData || null);
    } catch (err) {
      setErrorMessage(err.message || "Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceRecords(statusFilter);
  }, [statusFilter]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await attendanceApi.checkIn();
      setTodayRecord(result);
      setSuccessMessage("Check-in successful! Working session logged.");
      fetchAttendanceRecords(statusFilter);
    } catch (err) {
      setErrorMessage(err.message || "Check-in failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await attendanceApi.checkOut();
      setTodayRecord(result);
      setSuccessMessage("Check-out successful! Session completed.");
      fetchAttendanceRecords(statusFilter);
    } catch (err) {
      setErrorMessage(err.message || "Check-out failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "--";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "--:--";
    try {
      return new Date(dateStr).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 className="h4 fw-bold mb-1 section-title">Attendance Tracking</h2>
          <p className="text-muted mb-0 mt-1">
            {isAdminOrHR
              ? "Monitor organizational presence logs and daily check-in activity."
              : "Record daily check-in and check-out timestamps and review attendance logs."}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm px-3 d-flex align-items-center gap-1"
          onClick={() => fetchAttendanceRecords(statusFilter)}
        >
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
          <div>{errorMessage}</div>
          <button type="button" className="btn-close ms-auto" onClick={() => setErrorMessage("")}></button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="bi bi-check-circle-fill flex-shrink-0"></i>
          <div>{successMessage}</div>
          <button type="button" className="btn-close ms-auto" onClick={() => setSuccessMessage("")}></button>
        </div>
      )}

      {/* Today Session Card */}
      <div
        className="card shadow-sm border-0 mb-4"
        style={{
          borderLeft: "4px solid var(--accent-gold) !important",
          backgroundColor: "var(--surface-card)",
        }}
      >
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <StatusBadge
                  status={
                    todayRecord?.checkIn && todayRecord?.checkOut
                      ? "Completed"
                      : todayRecord?.checkIn && !todayRecord?.checkOut
                        ? "In Progress"
                        : "Not Checked In"
                  }
                />
                <span className="badge-status badge-status-neutral">
                  Daily Verification
                </span>
              </div>
              <h4 className="fw-bold mb-1">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h4>
              <p className="mb-0 text-muted small">
                Session Status:{" "}
                <strong className="text-primary">
                  {todayRecord?.checkIn && todayRecord?.checkOut
                    ? "Completed"
                    : todayRecord?.checkIn && !todayRecord?.checkOut
                      ? "In Progress"
                      : "Not Checked In"}
                </strong>
                {todayRecord?.checkIn && (
                  <span className="ms-2">
                    &bull; Check-in: <span className="font-monospace fw-semibold">{formatTime(todayRecord.checkIn)}</span>
                    <span className="ms-2">
                      | Check-out: <span className="font-monospace fw-semibold">{todayRecord?.checkOut ? formatTime(todayRecord.checkOut) : "--"}</span>
                    </span>
                  </span>
                )}
              </p>
            </div>

            <div className="d-flex gap-2">
              {!todayRecord ? (
                <button
                  type="button"
                  className="btn btn-primary px-4 py-2 fw-semibold d-flex align-items-center gap-2"
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Logging..." : (
                    <>
                      <i className="bi bi-box-arrow-in-right"></i> Check In Now
                    </>
                  )}
                </button>
              ) : !todayRecord.checkOut ? (
                <button
                  type="button"
                  className="btn btn-gold px-4 py-2 fw-bold d-flex align-items-center gap-2"
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Logging..." : (
                    <>
                      <i className="bi bi-box-arrow-right"></i> Check Out Now
                    </>
                  )}
                </button>
              ) : (
                <button type="button" className="btn btn-outline-secondary px-4 py-2" disabled>
                  <i className="bi bi-check2-all me-1"></i> Today's Session Completed
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance History Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-calendar3 text-primary fs-5"></i>
            Attendance Logs ({records.length})
          </h5>

          <div className="d-flex align-items-center gap-2">
            <label htmlFor="statusFilter" className="small text-muted mb-0 fw-semibold">
              Filter:
            </label>
            <select
              id="statusFilter"
              className="form-select form-select-sm"
              style={{ width: "150px" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Half-day">Half-day</option>
              <option value="Leave">Leave</option>
            </select>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="empty-state-box">
              <div className="spinner-border text-secondary mb-3" role="status"></div>
              <p className="mb-0">Loading attendance records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="empty-state-box">
              <i className="bi bi-clipboard-x empty-state-icon"></i>
              <p className="mb-0">No attendance entries found for the selected filter.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    {isAdminOrHR && <th>Employee</th>}
                    <th>Session Date</th>
                    <th>Check-In Time</th>
                    <th>Check-Out Time</th>
                    <th>Status</th>
                    <th>Recorded Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => (
                    <tr key={rec._id}>
                      {isAdminOrHR && (
                        <td>
                          <div className="fw-bold">{rec.employee?.name || "Staff"}</div>
                          <small className="text-muted font-monospace">
                            {rec.employee?.employeeId} &bull; {rec.employee?.department || "General"}
                          </small>
                        </td>
                      )}
                      <td className="fw-semibold">{formatDate(rec.date)}</td>
                      <td className="font-monospace small">{formatTime(rec.checkIn)}</td>
                      <td className="font-monospace small text-muted">
                        {rec.checkOut ? formatTime(rec.checkOut) : "--"}
                      </td>
                      <td>
                        <StatusBadge status={rec.status} />
                      </td>
                      <td className="small text-muted">{formatDate(rec.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Attendance;
