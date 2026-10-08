import React, { useState, useEffect } from "react";
import { salaryApi } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export function SalaryManager() {
  const [salaries, setSalaries] = useState([]);
  const [stats, setStats] = useState({ totalPayroll: 0, totalPaid: 0, totalPending: 0, employeesPaidCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [monthFilter, setMonthFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Details Modal
  const [selectedSalary, setSelectedSalary] = useState(null);

  const fetchSalaries = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await salaryApi.getSalaries({
        month: monthFilter !== "All" ? monthFilter : undefined,
        department: deptFilter !== "All" ? deptFilter : undefined,
        paymentStatus: statusFilter !== "All" ? statusFilter : undefined,
        search: searchTerm || undefined,
      });
      setSalaries(Array.isArray(data?.records) ? data.records : []);
      if (data?.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      setError(err.message || "Failed to load salary monitoring records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, [monthFilter, deptFilter, statusFilter]);

  const formatCurrency = (amt) => {
    if (amt === undefined || amt === null) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amt);
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

  const departments = [
    "All",
    "Engineering",
    "Product & Design",
    "People Operations",
    "Finance & Accounts",
    "Sales & Marketing",
    "Customer Success",
  ];

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 className="h4 fw-bold mb-1 section-title">Salary Monitoring</h2>
          <p className="text-muted mb-0 mt-1">
            Executive oversight of organization payroll expenditures, compensation breakdowns, and disbursement statuses.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm px-3 d-flex align-items-center gap-1"
          onClick={fetchSalaries}
        >
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button type="button" className="btn-close ms-auto" onClick={() => setError("")}></button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="kpi-card kpi-card-gold">
            <small className="text-muted fw-bold text-uppercase d-block mb-1">Total Organization Payroll</small>
            <div className="fs-4 fw-bold font-monospace">{formatCurrency(stats.totalPayroll)}</div>
            <small className="text-muted">Total active commitments</small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="kpi-card kpi-card-green">
            <small className="text-muted fw-bold text-uppercase d-block mb-1">Disbursed & Paid</small>
            <div className="fs-4 fw-bold font-monospace text-success">{formatCurrency(stats.totalPaid)}</div>
            <small className="text-muted">{stats.employeesPaidCount} personnel credited</small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="kpi-card kpi-card-amber">
            <small className="text-muted fw-bold text-uppercase d-block mb-1">Pending Processing</small>
            <div className="fs-4 fw-bold font-monospace text-warning">{formatCurrency(stats.totalPending)}</div>
            <small className="text-muted">In pipeline</small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="kpi-card kpi-card-blue">
            <small className="text-muted fw-bold text-uppercase d-block mb-1">Disbursement Progress</small>
            <div className="fs-4 fw-bold font-monospace">
              {stats.totalPayroll > 0 ? `${Math.round((stats.totalPaid / stats.totalPayroll) * 100)}%` : "0%"}
            </div>
            <small className="text-muted">Completed disbursement</small>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            {/* Search */}
            <div className="col-12 col-md-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search by employee, ID, or ref..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="button" className="btn btn-primary btn-sm px-3" onClick={fetchSalaries}>
                  Search
                </button>
              </div>
            </div>

            {/* Department */}
            <div className="col-6 col-md-3">
              <select
                className="form-select form-select-sm"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d === "All" ? "All Departments" : d}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="col-6 col-md-2">
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Processed">Processed</option>
                <option value="Credited">Credited</option>
              </select>
            </div>

            {/* Reset */}
            <div className="col-12 col-md-2 text-end">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={() => {
                  setSearchTerm("");
                  setDeptFilter("All");
                  setStatusFilter("All");
                  setMonthFilter("All");
                  fetchSalaries();
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Monitoring Table */}
      <div className="card shadow-sm border-0">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-shield-check text-primary fs-5"></i>
            Compensation Registers ({salaries.length})
          </h5>
          <span className="small text-muted">Read-Only Monitoring Mode</span>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="empty-state-box">
              <div className="spinner-border text-secondary mb-3" role="status"></div>
              <p className="mb-0">Loading monitoring data...</p>
            </div>
          ) : salaries.length === 0 ? (
            <div className="empty-state-box">
              <i className="bi bi-cash-stack empty-state-icon"></i>
              <h6 className="fw-bold">No Records Found</h6>
              <p className="small text-muted mb-0">No salary records match the selected filters.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Salary Month</th>
                    <th>Gross Salary</th>
                    <th>Deductions</th>
                    <th>Net Salary</th>
                    <th>Payment Status</th>
                    <th>Credited Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.map((sal) => (
                    <tr key={sal._id}>
                      <td>
                        <div className="fw-bold">{sal.employee?.name || "Employee"}</div>
                        <small className="text-muted font-monospace">{sal.employeeId}</small>
                      </td>
                      <td className="small">{sal.employee?.department || "General"}</td>
                      <td className="fw-semibold">{sal.salaryMonth}</td>
                      <td className="font-monospace small">{formatCurrency(sal.grossSalary)}</td>
                      <td className="font-monospace small text-danger">-{formatCurrency(sal.deductions)}</td>
                      <td>
                        <span className="fw-bold font-monospace text-primary">
                          {formatCurrency(sal.netSalary)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={sal.paymentStatus} />
                      </td>
                      <td className="small text-muted">{sal.paymentDate ? formatDate(sal.paymentDate) : "--"}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => setSelectedSalary(sal)}
                        >
                          <i className="bi bi-eye"></i> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* DETAIL STATEMENT MODAL */}
      {selectedSalary && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-receipt text-primary"></i>
                  Statement for {selectedSalary.employee?.name} ({selectedSalary.salaryMonth})
                </h5>
                <button type="button" className="btn-close" onClick={() => setSelectedSalary(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Employee</small>
                    <strong>{selectedSalary.employee?.name}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Employee ID</small>
                    <strong className="font-monospace">{selectedSalary.employeeId}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Department</small>
                    <strong>{selectedSalary.employee?.department || "General"}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Salary Month</small>
                    <strong>{selectedSalary.salaryMonth}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Status</small>
                    <StatusBadge status={selectedSalary.paymentStatus} />
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Payment Date</small>
                    <strong>{selectedSalary.paymentDate ? formatDate(selectedSalary.paymentDate) : "Pending"}</strong>
                  </div>
                </div>

                <div className="p-3 rounded-3" style={{ backgroundColor: "var(--surface-muted)", border: "1px solid var(--border-color)" }}>
                  <div className="salary-line-item">
                    <span>Basic Salary</span>
                    <span className="font-monospace fw-semibold">{formatCurrency(selectedSalary.basicSalary)}</span>
                  </div>
                  <div className="salary-line-item">
                    <span>Allowances</span>
                    <span className="font-monospace fw-semibold">{formatCurrency(selectedSalary.allowances)}</span>
                  </div>
                  <div className="salary-line-item">
                    <span>Bonus</span>
                    <span className="font-monospace fw-semibold">{formatCurrency(selectedSalary.bonus)}</span>
                  </div>
                  <div className="salary-line-item">
                    <span className="fw-bold">Gross Earnings</span>
                    <span className="font-monospace fw-bold">{formatCurrency(selectedSalary.grossSalary)}</span>
                  </div>
                  <div className="salary-line-item">
                    <span className="text-danger">Statutory Deductions</span>
                    <span className="font-monospace fw-semibold text-danger">-{formatCurrency(selectedSalary.deductions)}</span>
                  </div>
                  <div className="salary-total-line border-top mt-2 pt-2">
                    <span className="fs-5">Net Take-Home Pay</span>
                    <span className="fs-4 font-monospace" style={{ color: "var(--accent-gold)" }}>
                      {formatCurrency(selectedSalary.netSalary)}
                    </span>
                  </div>
                </div>

                {selectedSalary.transactionReference && (
                  <div className="mt-3 small text-muted">
                    Transaction Reference: <span className="font-monospace text-secondary">{selectedSalary.transactionReference}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setSelectedSalary(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalaryManager;
