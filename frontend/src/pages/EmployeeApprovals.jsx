import React, { useState, useEffect } from "react";
import { employeeApi } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export function EmployeeApprovals() {
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal states
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPendingEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await employeeApi.getPendingEmployees();
      setPendingList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load pending employee approvals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingEmployees();
  }, []);

  const handleApprove = async () => {
    if (!selectedEmployee) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await employeeApi.approveEmployee(selectedEmployee._id);
      setSuccess(res.message || `Employee ${selectedEmployee.name} approved successfully.`);
      setShowApproveModal(false);
      setSelectedEmployee(null);
      fetchPendingEmployees();
    } catch (err) {
      setError(err.message || "Failed to approve employee.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedEmployee) return;
    if (!rejectionReason.trim()) {
      setError("Please provide a valid rejection reason.");
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await employeeApi.rejectEmployee(selectedEmployee._id, rejectionReason.trim());
      setSuccess(res.message || `Employee ${selectedEmployee.name} rejected.`);
      setShowRejectModal(false);
      setSelectedEmployee(null);
      setRejectionReason("");
      fetchPendingEmployees();
    } catch (err) {
      setError(err.message || "Failed to reject employee.");
    } finally {
      setActionLoading(false);
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

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 className="h4 fw-bold mb-1 section-title">Employee Approvals</h2>
          <p className="text-muted mb-0 mt-1">
            Review and approve new employee onboarding requests submitted by the HR department.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm px-3 d-flex align-items-center gap-1"
          onClick={fetchPendingEmployees}
        >
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
          <div>{error}</div>
          <button type="button" className="btn-close ms-auto" onClick={() => setError("")}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="bi bi-check-circle-fill flex-shrink-0"></i>
          <div>{success}</div>
          <button type="button" className="btn-close ms-auto" onClick={() => setSuccess("")}></button>
        </div>
      )}

      {/* Main Approval Dashboard Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-person-check text-warning fs-5"></i>
            Pending Employee Requests ({pendingList.length})
          </h5>
          <span className="badge-status badge-status-pending">
            <i className="bi bi-clock-history"></i> Awaiting Manager Review
          </span>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="empty-state-box">
              <div className="spinner-border text-secondary mb-3" role="status"></div>
              <p className="mb-0">Loading pending requests...</p>
            </div>
          ) : pendingList.length === 0 ? (
            <div className="empty-state-box">
              <i className="bi bi-shield-check empty-state-icon text-success"></i>
              <h6 className="fw-bold text-primary">All Caught Up!</h6>
              <p className="mb-0 small text-muted">
                There are currently no pending employee onboarding requests awaiting manager review.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Employee Name</th>
                    <th>Employee ID</th>
                    <th>Email Address</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Joining Date</th>
                    <th>Created By</th>
                    <th>Request Date</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingList.map((emp) => (
                    <tr key={emp._id}>
                      <td className="fw-bold">{emp.name}</td>
                      <td>
                        <span className="badge bg-secondary-subtle text-secondary font-monospace">
                          {emp.employeeId}
                        </span>
                      </td>
                      <td className="small text-muted">{emp.email}</td>
                      <td className="small">{emp.department || "General"}</td>
                      <td className="small">{emp.designation || "Staff"}</td>
                      <td className="small">{formatDate(emp.joiningDate)}</td>
                      <td className="small text-muted">
                        {emp.createdBy?.name || "HR Officer"}
                      </td>
                      <td className="small text-muted">{formatDate(emp.createdAt)}</td>
                      <td>
                        <StatusBadge status={emp.approvalStatus || "Pending"} />
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setShowDetailModal(true);
                            }}
                            title="View Employee Details"
                          >
                            <i className="bi bi-eye"></i> Details
                          </button>
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setShowApproveModal(true);
                            }}
                            title="Approve Employee"
                          >
                            <i className="bi bi-check-lg"></i> Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setRejectionReason("");
                              setShowRejectModal(true);
                            }}
                            title="Reject Employee"
                          >
                            <i className="bi bi-x-lg"></i> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {showDetailModal && selectedEmployee && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-person-lines-fill" style={{ color: "var(--accent-gold)" }}></i>
                  Employee Onboarding Details
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Employee ID</small>
                    <strong className="font-monospace fs-6">{selectedEmployee.employeeId}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Full Name</small>
                    <strong className="fs-6">{selectedEmployee.name}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Work Email</small>
                    <strong className="text-break">{selectedEmployee.email}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Department</small>
                    <strong>{selectedEmployee.department || "General Operations"}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Designation</small>
                    <strong>{selectedEmployee.designation || "Employee"}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Joining Date</small>
                    <strong>{formatDate(selectedEmployee.joiningDate)}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Phone Number</small>
                    <strong>{selectedEmployee.phone || "Not specified"}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Approval Status</small>
                    <StatusBadge status={selectedEmployee.approvalStatus || "Pending"} />
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Created By</small>
                    <strong>{selectedEmployee.createdBy?.name || "HR Officer"}</strong>
                  </div>
                  <div className="col-12">
                    <small className="text-muted d-block">Residential Address</small>
                    <p className="mb-0 text-secondary">{selectedEmployee.address || "Not specified"}</p>
                  </div>
                </div>

                <div className="p-3 rounded-3" style={{ backgroundColor: "var(--surface-muted)", border: "1px solid var(--border-color)" }}>
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-info-circle" style={{ color: "var(--accent-gold)" }}></i>
                    <small className="text-muted">
                      Approving will activate this employee account, enabling portal login access.
                    </small>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => {
                    setShowDetailModal(false);
                    setRejectionReason("");
                    setShowRejectModal(true);
                  }}
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={() => {
                    setShowDetailModal(false);
                    setShowApproveModal(true);
                  }}
                >
                  Approve & Activate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM APPROVAL MODAL */}
      {showApproveModal && selectedEmployee && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2 text-success">
                  <i className="bi bi-check-circle-fill"></i> Approve Employee Account
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowApproveModal(false)}></button>
              </div>
              <div className="modal-body py-4">
                <p className="mb-2">
                  Are you sure you want to approve and activate the account for:
                </p>
                <div className="p-3 rounded-3 border mb-3" style={{ backgroundColor: "var(--surface-muted)", borderColor: "var(--border-color)" }}>
                  <div className="fw-bold">{selectedEmployee.name}</div>
                  <div className="small text-muted font-monospace">{selectedEmployee.employeeId} &bull; {selectedEmployee.email}</div>
                  <div className="small text-muted">{selectedEmployee.designation} &bull; {selectedEmployee.department}</div>
                </div>
                <p className="small text-muted mb-0">
                  Upon approval, this employee will be marked as <strong>Active</strong> and will immediately become eligible to log in to the Dayflow Employee Portal.
                </p>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={actionLoading}
                  onClick={() => setShowApproveModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm fw-bold px-3"
                  disabled={actionLoading}
                  onClick={handleApprove}
                >
                  {actionLoading ? "Processing..." : "Confirm Approval"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM REJECTION MODAL */}
      {showRejectModal && selectedEmployee && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2 text-danger">
                  <i className="bi bi-x-circle-fill"></i> Reject Employee Request
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowRejectModal(false)}></button>
              </div>
              <div className="modal-body py-4">
                <p className="mb-2">
                  Rejecting request for <strong>{selectedEmployee.name}</strong> ({selectedEmployee.employeeId}).
                </p>
                <div className="mb-3">
                  <label htmlFor="rejectionReason" className="form-label fw-semibold small">
                    Reason for Rejection <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="rejectionReason"
                    className="form-control"
                    rows="3"
                    placeholder="Enter reason for rejection (e.g. Incomplete onboarding documents, invalid employee ID format)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  ></textarea>
                </div>
                <p className="small text-muted mb-0">
                  The employee record will remain rejected and cannot access the employee portal.
                </p>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={actionLoading}
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm fw-bold px-3"
                  disabled={actionLoading || !rejectionReason.trim()}
                  onClick={handleReject}
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeApprovals;
