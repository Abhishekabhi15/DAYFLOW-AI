import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { dashboardApi, attendanceApi, leaveApi, salaryApi } from "../services/api";
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

export function Dashboard({ onNavigate }) {
  const { user } = useAuth();
  const isManager = user?.role === "Admin";
  const isHR = user?.role === "HR Officer";
  const isEmployee = user?.role === "Employee";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Management / HR Dashboard Data
  const [adminData, setAdminData] = useState({
    stats: {
      totalEmployees: 0,
      present: 0,
      pendingLeaves: 0,
      pendingApprovals: 0,
      totalPayroll: 0,
    },
    employees: [],
    attendance: [],
    pendingLeaves: [],
    pendingEmployees: [],
    recentSalaries: [],
  });

  // Employee Dashboard Data
  const [employeeAttendance, setEmployeeAttendance] = useState([]);
  const [employeeLeaves, setEmployeeLeaves] = useState([]);
  const [employeeSalary, setEmployeeSalary] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");

    try {
      if (isManager || isHR) {
        const data = await dashboardApi.getAdminDashboard();
        setAdminData({
          stats: data.stats || {
            totalEmployees: 0,
            present: 0,
            pendingLeaves: 0,
            pendingApprovals: 0,
            totalPayroll: 0,
          },
          employees: data.employees || [],
          attendance: data.attendance || [],
          pendingLeaves: data.pendingLeaves || [],
          pendingEmployees: data.pendingEmployees || [],
          recentSalaries: data.recentSalaries || [],
        });
      } else {
        const [attendanceRes, leavesRes, salaryRes, todayData] = await Promise.all([
          attendanceApi.getAttendance(),
          leaveApi.getLeaves(),
          salaryApi.getMySalary().catch(() => null),
          attendanceApi.getTodayAttendance().catch(() => null),
        ]);

        const attendanceList = Array.isArray(attendanceRes) ? attendanceRes : [];
        const leavesList = Array.isArray(leavesRes) ? leavesRes : [];

        setEmployeeAttendance(attendanceList);
        setEmployeeLeaves(leavesList);
        setEmployeeSalary(salaryRes?.currentSalary || null);
        setTodayRecord(todayData || null);
      }
    } catch (err) {
      setError(err.message || "Failed to load dashboard overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.role]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const record = await attendanceApi.checkIn();
      setTodayRecord(record);
      setSuccessMessage("Check-in successful! Attendance logged for today.");
      fetchDashboardData();
    } catch (err) {
      setError(err.message || "Failed to check in.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const record = await attendanceApi.checkOut();
      setTodayRecord(record);
      setSuccessMessage("Check-out successful! Working session completed.");
      fetchDashboardData();
    } catch (err) {
      setError(err.message || "Failed to check out.");
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

  const formatCurrency = (amt) => {
    if (amt === undefined || amt === null) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amt);
  };

  if (loading) {
    return (
      <div className="empty-state-box py-5">
        <div className="spinner-border text-secondary mb-3" role="status"></div>
        <p className="text-muted fw-medium mb-0">Loading Dayflow executive metrics...</p>
      </div>
    );
  }

  // Filter present staff today
  const presentTodayList = adminData.attendance.filter(
    (att) => isTodayRecord(att) && att.employee?.role === "Employee"
  );

  return (
    <div className="pb-4">
      {/* Overview Header Banner */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 className="h4 fw-bold mb-1 section-title">
            {isManager
              ? "Manager Executive Dashboard"
              : isHR
                ? "People Operations Dashboard"
                : "Employee Workspace"}
          </h2>
          <p className="text-muted mb-0 mt-1">
            Welcome, <span className="fw-bold text-primary">{user?.name}</span> &bull;{" "}
            <span className="user-role-tag">
              {isManager ? "Manager" : isHR ? "HR Officer" : "Employee"}
            </span>
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm px-3 d-flex align-items-center gap-1"
          onClick={fetchDashboardData}
        >
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
          <div>{error}</div>
          <button type="button" className="btn-close ms-auto" onClick={() => setError("")}></button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="bi bi-check-circle-fill flex-shrink-0"></i>
          <div>{successMessage}</div>
          <button type="button" className="btn-close ms-auto" onClick={() => setSuccessMessage("")}></button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. MANAGER & HR DASHBOARD VIEW */}
      {/* ==================================================================== */}
      {(isManager || isHR) && (
        <>
          {/* Executive KPI Cards */}
          <div className="row g-3 mb-4">
            {/* Total Employees */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="kpi-card kpi-card-gold h-100"
                style={{ cursor: onNavigate ? "pointer" : "default" }}
                onClick={() => onNavigate && onNavigate("employees")}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <small className="text-muted fw-bold text-uppercase d-block mb-1">
                      Total Employees
                    </small>
                    <div className="fs-3 fw-bold">{adminData.stats.totalEmployees}</div>
                    <small className="text-muted">Active workforce</small>
                  </div>
                  <div className="kpi-card-icon" style={{ backgroundColor: "var(--accent-gold-subtle)", color: "var(--accent-gold)" }}>
                    <i className="bi bi-people-fill"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Present Today */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="kpi-card kpi-card-green h-100"
                style={{ cursor: onNavigate ? "pointer" : "default" }}
                onClick={() => onNavigate && onNavigate("attendance")}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <small className="text-muted fw-bold text-uppercase d-block mb-1">
                      Present Today
                    </small>
                    <div className="fs-3 fw-bold text-success">{adminData.stats.present}</div>
                    <small className="text-muted">Verified check-ins</small>
                  </div>
                  <div className="kpi-card-icon" style={{ backgroundColor: "var(--status-approved-bg)", color: "var(--status-approved)" }}>
                    <i className="bi bi-calendar-check-fill"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="kpi-card kpi-card-amber h-100"
                style={{ cursor: onNavigate ? "pointer" : "default" }}
                onClick={() => onNavigate && onNavigate(isManager ? "approvals" : "management")}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <small className="text-muted fw-bold text-uppercase d-block mb-1">
                      Pending Approvals
                    </small>
                    <div className="fs-3 fw-bold text-warning">{adminData.stats.pendingApprovals}</div>
                    <small className="text-muted">
                      {isManager ? "Action required" : "Awaiting review"}
                    </small>
                  </div>
                  <div className="kpi-card-icon" style={{ backgroundColor: "var(--status-pending-bg)", color: "var(--status-pending)" }}>
                    <i className="bi bi-person-exclamation"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Payroll */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="kpi-card kpi-card-blue h-100"
                style={{ cursor: onNavigate ? "pointer" : "default" }}
                onClick={() => onNavigate && onNavigate(isManager ? "salary_monitoring" : "salary_management")}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <small className="text-muted fw-bold text-uppercase d-block mb-1">
                      Payroll Commitment
                    </small>
                    <div className="fs-4 fw-bold font-monospace">{formatCurrency(adminData.stats.totalPayroll)}</div>
                    <small className="text-muted">Current cycle</small>
                  </div>
                  <div className="kpi-card-icon" style={{ backgroundColor: "var(--status-info-bg)", color: "var(--status-info)" }}>
                    <i className="bi bi-cash-stack"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Strip for Manager & HR */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span className="small fw-bold text-muted text-uppercase">Quick Management Shortcuts:</span>
                <div className="d-flex gap-2 flex-wrap">
                  {isManager && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                      onClick={() => onNavigate && onNavigate("approvals")}
                    >
                      <i className="bi bi-shield-check text-warning"></i>
                      <span>Employee Approvals ({adminData.stats.pendingApprovals})</span>
                    </button>
                  )}

                  {isHR && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                      onClick={() => onNavigate && onNavigate("management")}
                    >
                      <i className="bi bi-person-plus-fill"></i>
                      <span>Onboard New Employee</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                    onClick={() => onNavigate && onNavigate("employees")}
                  >
                    <i className="bi bi-people"></i>
                    <span>Employee Directory</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                    onClick={() => onNavigate && onNavigate("leave")}
                  >
                    <i className="bi bi-file-earmark-text"></i>
                    <span>Pending Leaves ({adminData.stats.pendingLeaves})</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                    onClick={() =>
                      onNavigate &&
                      onNavigate(isManager ? "salary_monitoring" : "salary_management")
                    }
                  >
                    <i className="bi bi-cash"></i>
                    <span>{isManager ? "Salary Monitoring" : "Salary Management"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dual Panel: Pending Employee Requests & Today's Attendance Activity */}
          <div className="row g-4 mb-4">
            {/* Pending Approvals Table Panel */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header py-3 d-flex justify-content-between align-items-center">
                  <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-hourglass-split text-warning"></i>
                    Pending Employee Requests ({adminData.pendingEmployees.length})
                  </h5>
                  {isManager && onNavigate && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold"
                      style={{ color: "var(--accent-gold)" }}
                      onClick={() => onNavigate("approvals")}
                    >
                      Open Approvals &rarr;
                    </button>
                  )}
                </div>

                <div className="card-body p-0">
                  {adminData.pendingEmployees.length === 0 ? (
                    <div className="empty-state-box py-4">
                      <i className="bi bi-check2-circle empty-state-icon text-success fs-2"></i>
                      <p className="mb-0 small text-muted">No pending onboarding requests.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Candidate</th>
                            <th>Department</th>
                            <th>Created By</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminData.pendingEmployees.slice(0, 5).map((emp) => (
                            <tr key={emp._id}>
                              <td>
                                <div className="fw-bold">{emp.name}</div>
                                <small className="text-muted font-monospace">{emp.employeeId}</small>
                              </td>
                              <td className="small">{emp.department || "General"}</td>
                              <td className="small text-muted">{emp.createdBy?.name || "HR Officer"}</td>
                              <td>
                                <StatusBadge status={emp.approvalStatus || "Pending"} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Present Personnel Activity */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header py-3 d-flex justify-content-between align-items-center">
                  <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-person-check text-success"></i>
                    Today's Attendance Activity ({presentTodayList.length})
                  </h5>
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold"
                      style={{ color: "var(--accent-gold)" }}
                      onClick={() => onNavigate("attendance")}
                    >
                      View All &rarr;
                    </button>
                  )}
                </div>

                <div className="card-body p-0">
                  {presentTodayList.length === 0 ? (
                    <div className="empty-state-box py-4">
                      <i className="bi bi-clock empty-state-icon fs-2"></i>
                      <p className="mb-0 small text-muted">No check-in records logged today yet.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Staff Member</th>
                            <th>Check-In</th>
                            <th>Check-Out</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {presentTodayList.slice(0, 5).map((att) => (
                            <tr key={att._id}>
                              <td>
                                <div className="fw-bold">{att.employee?.name || "Staff Member"}</div>
                                <small className="text-muted font-monospace">{att.employee?.employeeId}</small>
                              </td>
                              <td className="small fw-semibold text-success">{formatTime(att.checkIn)}</td>
                              <td className="small text-muted">{att.checkOut ? formatTime(att.checkOut) : "--"}</td>
                              <td>
                                <StatusBadge status={att.checkOut ? "Completed" : (att.status || "In Progress")} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================================================================== */}
      {/* 2. EMPLOYEE DASHBOARD VIEW */}
      {/* ==================================================================== */}
      {isEmployee && (
        <>
          {/* Employee Top Widgets */}
          <div className="row g-3 mb-4">
            {/* Today's Attendance Widget */}
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body p-4 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <small className="text-muted fw-bold text-uppercase">
                        Today's Attendance
                      </small>
                      <StatusBadge
                        status={
                          todayRecord?.checkIn && todayRecord?.checkOut
                            ? "Completed"
                            : todayRecord?.checkIn && !todayRecord?.checkOut
                              ? "In Progress"
                              : "Not Checked In"
                        }
                      />
                    </div>
                    <h5 className="fw-bold mb-1">
                      {new Date().toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </h5>
                    <p className="text-muted small mb-3">
                      Check-in: <strong className="font-monospace text-primary">{todayRecord?.checkIn ? formatTime(todayRecord.checkIn) : "--"}</strong>
                      <span className="ms-2">| Check-out: <strong className="font-monospace text-primary">{todayRecord?.checkIn && todayRecord?.checkOut ? formatTime(todayRecord.checkOut) : "--"}</strong></span>
                    </p>
                  </div>

                  <div>
                    {!todayRecord ? (
                      <button
                        type="button"
                        className="btn btn-primary w-100 py-2.5 d-flex align-items-center justify-content-center gap-2"
                        onClick={handleCheckIn}
                        disabled={actionLoading}
                      >
                        {actionLoading ? "Logging In..." : (
                          <>
                            <i className="bi bi-box-arrow-in-right"></i> Check In Now
                          </>
                        )}
                      </button>
                    ) : !todayRecord.checkOut ? (
                      <button
                        type="button"
                        className="btn btn-gold w-100 py-2.5 d-flex align-items-center justify-content-center gap-2"
                        onClick={handleCheckOut}
                        disabled={actionLoading}
                      >
                        {actionLoading ? "Logging Out..." : (
                          <>
                            <i className="bi bi-box-arrow-right"></i> Check Out Now
                          </>
                        )}
                      </button>
                    ) : (
                      <button type="button" className="btn btn-outline-secondary w-100 py-2" disabled>
                        <i className="bi bi-check-all me-1"></i> Today's Session Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Days Logged */}
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body p-4 d-flex align-items-center gap-3">
                  <div className="kpi-card-icon" style={{ backgroundColor: "var(--status-approved-bg)", color: "var(--status-approved)" }}>
                    <i className="bi bi-calendar-check fs-3"></i>
                  </div>
                  <div>
                    <small className="text-muted fw-bold text-uppercase d-block">
                      Attendance History
                    </small>
                    <div className="fs-3 fw-bold">{employeeAttendance.length}</div>
                    <small className="text-muted">Total working sessions logged</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Salary Preview */}
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <small className="text-muted fw-bold text-uppercase">
                      Current Compensation
                    </small>
                    {employeeSalary && <StatusBadge status={employeeSalary.paymentStatus} />}
                  </div>
                  {employeeSalary ? (
                    <div>
                      <div className="fs-4 fw-bold font-monospace" style={{ color: "var(--accent-gold)" }}>
                        {formatCurrency(employeeSalary.netSalary)}
                      </div>
                      <small className="text-muted d-block">
                        Month: {employeeSalary.salaryMonth}
                      </small>
                      {employeeSalary.paymentDate && (
                        <small className="text-muted" style={{ fontSize: "11px" }}>
                          Credited on {formatDate(employeeSalary.paymentDate)}
                        </small>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="fs-5 text-muted">No slip available</div>
                      <small className="text-muted">Awaiting monthly payroll processing</small>
                    </div>
                  )}
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn btn-link p-0 small text-decoration-none mt-2 fw-semibold"
                      style={{ color: "var(--accent-gold)" }}
                      onClick={() => onNavigate("salary")}
                    >
                      View Salary Statement &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Attendance & Leave History */}
          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header py-3 d-flex justify-content-between align-items-center">
                  <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-clock-history text-secondary"></i>
                    Recent Attendance Logs
                  </h5>
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold"
                      style={{ color: "var(--accent-gold)" }}
                      onClick={() => onNavigate("attendance")}
                    >
                      View All &rarr;
                    </button>
                  )}
                </div>
                <div className="card-body p-0">
                  {employeeAttendance.length === 0 ? (
                    <div className="empty-state-box py-4">
                      <p className="mb-0 small text-muted">No attendance logs yet.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Date</th>
                            <th>Check-In</th>
                            <th>Check-Out</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeAttendance.slice(0, 5).map((att) => (
                            <tr key={att._id}>
                              <td className="fw-semibold">{formatDate(att.date)}</td>
                              <td>{formatTime(att.checkIn)}</td>
                              <td className="text-muted">{att.checkOut ? formatTime(att.checkOut) : "--"}</td>
                              <td>
                                <StatusBadge status={att.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header py-3 d-flex justify-content-between align-items-center">
                  <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-file-earmark-text text-secondary"></i>
                    My Leave Requests
                  </h5>
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold"
                      style={{ color: "var(--accent-gold)" }}
                      onClick={() => onNavigate("leave")}
                    >
                      Apply Leave &rarr;
                    </button>
                  )}
                </div>
                <div className="card-body p-0">
                  {employeeLeaves.length === 0 ? (
                    <div className="empty-state-box py-4">
                      <p className="mb-0 small text-muted">No leave requests submitted.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Type</th>
                            <th>Duration</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeLeaves.slice(0, 5).map((leave) => (
                            <tr key={leave._id}>
                              <td className="fw-semibold">{leave.leaveType} Leave</td>
                              <td className="small text-muted">
                                {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                              </td>
                              <td>
                                <StatusBadge status={leave.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
