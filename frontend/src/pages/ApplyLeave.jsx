import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { leaveApi } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export function ApplyLeave({ onLeaveSubmitted }) {
  const { user } = useAuth();
  const isAdminOrHR = user?.role === "Admin" || user?.role === "HR Officer";

  const [activeTab, setActiveTab] = useState("apply");
  const [formData, setFormData] = useState({
    leaveType: "Paid",
    startDate: "",
    endDate: "",
    remarks: "",
  });

  const [leavesList, setLeavesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingLeaves, setFetchingLeaves] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [processingId, setProcessingId] = useState(null);
  const [adminCommentInput, setAdminCommentInput] = useState({});
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchLeaves = async () => {
    setFetchingLeaves(true);
    try {
      const data = await leaveApi.getLeaves();
      setLeavesList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch leaves:", error);
    } finally {
      setFetchingLeaves(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const result = await leaveApi.applyLeave({
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        remarks: formData.remarks,
      });

      setMessage({
        type: "success",
        text: "Leave application submitted successfully!",
      });

      setFormData({
        leaveType: "Paid",
        startDate: "",
        endDate: "",
        remarks: "",
      });

      fetchLeaves();
      if (onLeaveSubmitted) onLeaveSubmitted(result);
    } catch (error) {
      setMessage({
        type: "danger",
        text: error.message || "Failed to submit leave application.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAction = async (leaveId, status) => {
    setProcessingId(leaveId);
    setMessage({ type: "", text: "" });

    try {
      const comment =
        adminCommentInput[leaveId] ||
        `${status} by ${user?.name || "Management"}`;

      await leaveApi.updateLeave(leaveId, {
        status,
        adminComment: comment,
      });

      setMessage({
        type: "success",
        text: `Leave request has been ${status.toLowerCase()}.`,
      });

      fetchLeaves();
    } catch (error) {
      setMessage({
        type: "danger",
        text: error.message || "Failed to update leave request.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "--";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  const filteredLeaves = leavesList.filter((leave) => {
    if (statusFilter === "All") return true;
    return leave.status === statusFilter;
  });

  return (
    <div className="pb-4">
      {/* Module Title */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 className="h4 fw-bold mb-1 section-title">Leave Management</h2>
          <p className="text-muted mb-0 mt-1">
            {isAdminOrHR
              ? "Process employee leave requests and submit personal time-off applications."
              : "Submit leave requests and monitor manager review status."}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="btn-group p-1 bg-white border rounded-3 shadow-sm">
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "apply" ? "btn-primary" : "btn-light text-muted border-0"}`}
            onClick={() => setActiveTab("apply")}
          >
            <i className="bi bi-pencil-square me-1"></i> Apply Leave
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "history" ? "btn-primary" : "btn-light text-muted border-0"}`}
            onClick={() => {
              setActiveTab("history");
              fetchLeaves();
            }}
          >
            <i className="bi bi-clock-history me-1"></i> My Applications ({leavesList.length})
          </button>
          {isAdminOrHR && (
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "approvals" ? "btn-primary" : "btn-light text-muted border-0"}`}
              onClick={() => {
                setActiveTab("approvals");
                fetchLeaves();
              }}
            >
              <i className="bi bi-check2-square me-1"></i> Staff Requests (
              {leavesList.filter((l) => l.status === "Pending").length})
            </button>
          )}
        </div>
      </div>

      {/* Global Alerts */}
      {message.text && (
        <div
          className={`alert alert-${message.type} alert-dismissible fade show d-flex align-items-center gap-2 mb-4`}
          role="alert"
        >
          <i
            className={`bi ${
              message.type === "success"
                ? "bi-check-circle-fill"
                : "bi-exclamation-triangle-fill"
            } flex-shrink-0`}
          ></i>
          <div>{message.text}</div>
          <button
            type="button"
            className="btn-close ms-auto"
            onClick={() => setMessage({ type: "", text: "" })}
          ></button>
        </div>
      )}

      {/* TAB 1: APPLY FOR LEAVE FORM */}
      {activeTab === "apply" && (
        <div className="card shadow-sm border-0 mx-auto" style={{ maxWidth: "680px" }}>
          <div className="card-header py-3">
            <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-calendar-plus text-primary fs-5"></i>
              Submit Time-Off Application
            </h5>
          </div>
          <div className="card-body p-4">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="leaveType" className="form-label fw-semibold small">
                  Leave Type <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  id="leaveType"
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleChange}
                  required
                >
                  <option value="Paid">Paid Annual Leave</option>
                  <option value="Sick">Medical / Sick Leave</option>
                  <option value="Unpaid">Unpaid Personal Leave</option>
                </select>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label htmlFor="startDate" className="form-label fw-semibold small">
                    Start Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="endDate" className="form-label fw-semibold small">
                    End Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    id="endDate"
                    name="endDate"
                    min={formData.startDate}
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {formData.startDate && formData.endDate && (
                <div className="alert alert-light border py-2 mb-3 small d-flex align-items-center gap-2">
                  <i className="bi bi-info-circle text-primary"></i>
                  Total Leave Days:{" "}
                  <strong>{calculateDays(formData.startDate, formData.endDate)} day(s)</strong>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="remarks" className="form-label fw-semibold small">
                  Reason / Purpose <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  id="remarks"
                  name="remarks"
                  rows="3"
                  placeholder="State the reason for your time-off request..."
                  value={formData.remarks}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2"
                disabled={loading}
              >
                {loading ? "Submitting..." : (
                  <>
                    <i className="bi bi-send me-1"></i> Submit Leave Request
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: MY LEAVE APPLICATIONS */}
      {activeTab === "history" && (
        <div className="card shadow-sm border-0">
          <div className="card-header py-3 d-flex justify-content-between align-items-center">
            <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-clock-history text-primary fs-5"></i>
              My Leave History ({leavesList.length})
            </h5>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3"
              onClick={fetchLeaves}
            >
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </button>
          </div>

          <div className="card-body p-0">
            {fetchingLeaves ? (
              <div className="empty-state-box">
                <div className="spinner-border text-secondary mb-3" role="status"></div>
                <p className="mb-0">Loading your applications...</p>
              </div>
            ) : leavesList.length === 0 ? (
              <div className="empty-state-box">
                <i className="bi bi-calendar-x empty-state-icon"></i>
                <p className="mb-2">No leave applications submitted yet.</p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveTab("apply")}
                >
                  Apply for Leave Now
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Duration</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Reviewer Comment</th>
                      <th>Submitted On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leavesList.map((leave) => (
                      <tr key={leave._id}>
                        <td className="fw-semibold">{leave.leaveType} Leave</td>
                        <td className="small">
                          {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                        </td>
                        <td>
                          <span className="badge bg-secondary-subtle text-secondary">
                            {calculateDays(leave.startDate, leave.endDate)}d
                          </span>
                        </td>
                        <td className="small text-muted">{leave.remarks || "--"}</td>
                        <td>
                          <StatusBadge status={leave.status} />
                        </td>
                        <td className="small text-muted">{leave.adminComment || "--"}</td>
                        <td className="small text-muted">{formatDate(leave.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ADMIN / HR APPROVALS */}
      {isAdminOrHR && activeTab === "approvals" && (
        <div className="card shadow-sm border-0">
          <div className="card-header py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-shield-check text-primary fs-5"></i>
              Staff Leave Review Management
            </h5>

            <div className="btn-group btn-group-sm">
              {["All", "Pending", "Approved", "Rejected"].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`btn ${statusFilter === st ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="card-body p-0">
            {fetchingLeaves ? (
              <div className="empty-state-box">
                <div className="spinner-border text-secondary mb-3" role="status"></div>
                <p className="mb-0">Loading requests...</p>
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="empty-state-box">
                <i className="bi bi-check2-circle empty-state-icon text-success"></i>
                <p className="mb-0">No leave requests matching "{statusFilter}".</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Review Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaves.map((leave) => (
                      <tr key={leave._id}>
                        <td>
                          <div className="fw-bold">{leave.employee?.name || "Employee"}</div>
                          <small className="text-muted font-monospace">
                            {leave.employee?.employeeId} &bull; {leave.employee?.department || "General"}
                          </small>
                        </td>
                        <td className="small fw-semibold">{leave.leaveType}</td>
                        <td>
                          <div className="small fw-semibold">
                            {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                          </div>
                          <small className="text-muted">
                            {calculateDays(leave.startDate, leave.endDate)} days
                          </small>
                        </td>
                        <td className="small text-muted" style={{ maxWidth: "220px" }}>
                          {leave.remarks || "--"}
                        </td>
                        <td>
                          <StatusBadge status={leave.status} />
                        </td>
                        <td>
                          {leave.status === "Pending" ? (
                            <div className="d-flex flex-column gap-1" style={{ minWidth: "200px" }}>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Review comment..."
                                value={adminCommentInput[leave._id] || ""}
                                onChange={(e) =>
                                  setAdminCommentInput({
                                    ...adminCommentInput,
                                    [leave._id]: e.target.value,
                                  })
                                }
                              />
                              <div className="btn-group btn-group-sm w-100">
                                <button
                                  type="button"
                                  className="btn btn-success"
                                  disabled={processingId === leave._id}
                                  onClick={() => handleAdminAction(leave._id, "Approved")}
                                >
                                  {processingId === leave._id ? "..." : "Approve"}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger"
                                  disabled={processingId === leave._id}
                                  onClick={() => handleAdminAction(leave._id, "Rejected")}
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ) : (
                            <small className="text-muted">
                              {leave.adminComment || "Resolved"}
                            </small>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplyLeave;
