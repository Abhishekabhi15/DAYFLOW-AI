import React, { useState, useEffect } from "react";
import { salaryApi, employeeApi } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export function SalaryHR() {
  const [salaries, setSalaries] = useState([]);
  const [stats, setStats] = useState({ totalPayroll: 0, totalPaid: 0, totalPending: 0, employeesPaidCount: 0 });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [monthFilter, setMonthFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Create Salary Form Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    salaryMonth: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
    basicSalary: "",
    allowances: "0",
    deductions: "0",
    bonus: "0",
    paymentStatus: "Pending",
  });
  const [submitting, setSubmitting] = useState(false);

  // Credit / Status Modal
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [txRef, setTxRef] = useState("");
  const [crediting, setCrediting] = useState(false);

  const fetchSalaries = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await salaryApi.getSalaries({
        month: monthFilter !== "All" ? monthFilter : undefined,
        paymentStatus: statusFilter !== "All" ? statusFilter : undefined,
        search: searchTerm || undefined,
      });
      setSalaries(Array.isArray(data?.records) ? data.records : []);
      if (data?.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      setError(err.message || "Failed to load salary records.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesList = async () => {
    try {
      const data = await employeeApi.getEmployees({ approvalStatus: "Approved" });
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Could not load employee select list:", err.message);
    }
  };

  useEffect(() => {
    fetchSalaries();
    fetchEmployeesList();
  }, [monthFilter, statusFilter]);

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateSalary = async (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.salaryMonth || !formData.basicSalary) {
      setError("Please select employee, month, and enter basic salary.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await salaryApi.createSalary({
        employeeId: formData.employeeId,
        salaryMonth: formData.salaryMonth,
        basicSalary: Number(formData.basicSalary),
        allowances: Number(formData.allowances) || 0,
        deductions: Number(formData.deductions) || 0,
        bonus: Number(formData.bonus) || 0,
        paymentStatus: formData.paymentStatus,
      });

      setSuccess(res.message || "Salary slip created successfully.");
      setShowCreateModal(false);
      setFormData({
        employeeId: "",
        salaryMonth: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
        basicSalary: "",
        allowances: "0",
        deductions: "0",
        bonus: "0",
        paymentStatus: "Pending",
      });
      fetchSalaries();
    } catch (err) {
      setError(err.message || "Failed to create salary record.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreditSalary = async () => {
    if (!selectedSalary) return;
    setCrediting(true);
    setError("");
    setSuccess("");
    try {
      const res = await salaryApi.creditSalary(selectedSalary._id, {
        transactionReference: txRef.trim(),
        paymentDate: new Date(),
      });
      setSuccess(res.message || "Salary credited successfully.");
      setShowCreditModal(false);
      setSelectedSalary(null);
      setTxRef("");
      fetchSalaries();
    } catch (err) {
      setError(err.message || "Failed to credit salary.");
    } finally {
      setCrediting(false);
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

  const grossPreview =
    (Number(formData.basicSalary) || 0) +
    (Number(formData.allowances) || 0) +
    (Number(formData.bonus) || 0);

  const netPreview = Math.max(0, grossPreview - (Number(formData.deductions) || 0));

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 className="h4 fw-bold mb-1 section-title">Salary Management</h2>
          <p className="text-muted mb-0 mt-1">
            Generate monthly payroll records, calculate deductions and allowances, and process salary disbursements.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm px-3 fw-bold d-flex align-items-center gap-1 shadow-sm"
            onClick={() => {
              setShowCreateModal(true);
              fetchEmployeesList();
            }}
          >
            <i className="bi bi-plus-lg"></i> Create Salary Slip
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm px-3 d-flex align-items-center gap-1"
            onClick={fetchSalaries}
          >
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
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

      {/* Summary KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="kpi-card kpi-card-gold">
            <small className="text-muted fw-bold text-uppercase d-block mb-1">Total Payroll</small>
            <div className="fs-4 fw-bold font-monospace">{formatCurrency(stats.totalPayroll)}</div>
            <small className="text-muted">{salaries.length} records</small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="kpi-card kpi-card-green">
            <small className="text-muted fw-bold text-uppercase d-block mb-1">Total Credited</small>
            <div className="fs-4 fw-bold font-monospace text-success">{formatCurrency(stats.totalPaid)}</div>
            <small className="text-muted">{stats.employeesPaidCount} paid</small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="kpi-card kpi-card-amber">
            <small className="text-muted fw-bold text-uppercase d-block mb-1">Pending Disbursement</small>
            <div className="fs-4 fw-bold font-monospace text-warning">{formatCurrency(stats.totalPending)}</div>
            <small className="text-muted">Awaiting credit</small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="kpi-card kpi-card-blue">
            <small className="text-muted fw-bold text-uppercase d-block mb-1">Payment Ratio</small>
            <div className="fs-4 fw-bold font-monospace">
              {stats.totalPayroll > 0 ? `${Math.round((stats.totalPaid / stats.totalPayroll) * 100)}%` : "0%"}
            </div>
            <small className="text-muted">Settled volume</small>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search by employee name, ID, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="button" className="btn btn-primary btn-sm px-3" onClick={fetchSalaries}>
                  Search
                </button>
              </div>
            </div>

            <div className="col-6 col-md-3">
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

            <div className="col-6 col-md-4 text-end">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("All");
                  setMonthFilter("All");
                  fetchSalaries();
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Salaries Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-cash-stack text-primary fs-5"></i>
            Monthly Payroll Registers ({salaries.length})
          </h5>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="empty-state-box">
              <div className="spinner-border text-secondary mb-3" role="status"></div>
              <p className="mb-0">Loading payroll data...</p>
            </div>
          ) : salaries.length === 0 ? (
            <div className="empty-state-box">
              <i className="bi bi-receipt-cutoff empty-state-icon"></i>
              <h6 className="fw-bold">No Payroll Records Found</h6>
              <p className="small text-muted mb-3">
                No salary records have been created for the selected filter. Click below to generate a new payroll entry.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm px-3"
                onClick={() => setShowCreateModal(true)}
              >
                Create Salary Slip
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Employee</th>
                    <th>Salary Month</th>
                    <th>Basic</th>
                    <th>Allowances</th>
                    <th>Deductions</th>
                    <th>Gross</th>
                    <th>Net Salary</th>
                    <th>Payment Status</th>
                    <th>Payment Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.map((sal) => (
                    <tr key={sal._id}>
                      <td>
                        <div className="fw-bold">{sal.employee?.name || "Employee"}</div>
                        <small className="text-muted font-monospace">
                          {sal.employeeId} &bull; {sal.employee?.department || "General"}
                        </small>
                      </td>
                      <td className="fw-semibold">{sal.salaryMonth}</td>
                      <td className="font-monospace small">{formatCurrency(sal.basicSalary)}</td>
                      <td className="font-monospace small text-muted">{formatCurrency(sal.allowances)}</td>
                      <td className="font-monospace small text-danger">-{formatCurrency(sal.deductions)}</td>
                      <td className="font-monospace small">{formatCurrency(sal.grossSalary)}</td>
                      <td>
                        <span className="fw-bold font-monospace text-primary">
                          {formatCurrency(sal.netSalary)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={sal.paymentStatus || "Pending"} />
                      </td>
                      <td className="small text-muted">
                        {sal.paymentDate ? formatDate(sal.paymentDate) : "--"}
                      </td>
                      <td className="text-end">
                        {sal.paymentStatus !== "Credited" ? (
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => {
                              setSelectedSalary(sal);
                              setTxRef(`TXN-${Date.now().toString(36).toUpperCase()}`);
                              setShowCreditModal(true);
                            }}
                          >
                            <i className="bi bi-check2-circle me-1"></i> Credit
                          </button>
                        ) : (
                          <span className="badge bg-success-subtle text-success small">
                            <i className="bi bi-check-all"></i> Settled
                          </span>
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

      {/* CREATE SALARY MODAL */}
      {showCreateModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-receipt text-primary"></i> Create Monthly Salary Slip
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <form onSubmit={handleCreateSalary}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    {/* Select Employee */}
                    <div className="col-md-6">
                      <label htmlFor="salEmp" className="form-label fw-semibold small">
                        Select Employee <span className="text-danger">*</span>
                      </label>
                      <select
                        id="salEmp"
                        name="employeeId"
                        className="form-select"
                        value={formData.employeeId}
                        onChange={handleFormChange}
                        required
                      >
                        <option value="">-- Choose Employee --</option>
                        {employees.map((emp) => (
                          <option key={emp._id} value={emp.employeeId}>
                            {emp.name} ({emp.employeeId}) - {emp.department}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Salary Month */}
                    <div className="col-md-6">
                      <label htmlFor="salMonth" className="form-label fw-semibold small">
                        Salary Month <span className="text-danger">*</span>
                      </label>
                      <input
                        id="salMonth"
                        type="text"
                        name="salaryMonth"
                        className="form-control"
                        placeholder="e.g. October 2026"
                        value={formData.salaryMonth}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    {/* Basic Salary */}
                    <div className="col-md-6 col-lg-3">
                      <label htmlFor="salBasic" className="form-label fw-semibold small">
                        Basic Salary (₹) <span className="text-danger">*</span>
                      </label>
                      <input
                        id="salBasic"
                        type="number"
                        min="0"
                        name="basicSalary"
                        className="form-control"
                        placeholder="50000"
                        value={formData.basicSalary}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    {/* Allowances */}
                    <div className="col-md-6 col-lg-3">
                      <label htmlFor="salAllow" className="form-label fw-semibold small">
                        Allowances (HRA, TA) (₹)
                      </label>
                      <input
                        id="salAllow"
                        type="number"
                        min="0"
                        name="allowances"
                        className="form-control"
                        placeholder="10000"
                        value={formData.allowances}
                        onChange={handleFormChange}
                      />
                    </div>

                    {/* Bonus */}
                    <div className="col-md-6 col-lg-3">
                      <label htmlFor="salBonus" className="form-label fw-semibold small">
                        Performance Bonus (₹)
                      </label>
                      <input
                        id="salBonus"
                        type="number"
                        min="0"
                        name="bonus"
                        className="form-control"
                        placeholder="5000"
                        value={formData.bonus}
                        onChange={handleFormChange}
                      />
                    </div>

                    {/* Deductions */}
                    <div className="col-md-6 col-lg-3">
                      <label htmlFor="salDed" className="form-label fw-semibold small">
                        Deductions / TDS (₹)
                      </label>
                      <input
                        id="salDed"
                        type="number"
                        min="0"
                        name="deductions"
                        className="form-control"
                        placeholder="2500"
                        value={formData.deductions}
                        onChange={handleFormChange}
                      />
                    </div>

                    {/* Initial Payment Status */}
                    <div className="col-md-6">
                      <label htmlFor="salStatus" className="form-label fw-semibold small">
                        Initial Payment Status
                      </label>
                      <select
                        id="salStatus"
                        name="paymentStatus"
                        className="form-select"
                        value={formData.paymentStatus}
                        onChange={handleFormChange}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processed">Processed</option>
                        <option value="Credited">Credited</option>
                      </select>
                    </div>

                    {/* Live Calculation Preview */}
                    <div className="col-12 mt-3">
                      <div className="p-3 rounded-3" style={{ backgroundColor: "var(--surface-muted)", border: "1px solid var(--border-color)" }}>
                        <div className="row text-center g-2">
                          <div className="col-6 col-sm-3">
                            <small className="text-muted d-block">Basic Salary</small>
                            <span className="font-monospace fw-semibold">{formatCurrency(formData.basicSalary || 0)}</span>
                          </div>
                          <div className="col-6 col-sm-3">
                            <small className="text-muted d-block">Gross Earnings</small>
                            <span className="font-monospace fw-semibold">{formatCurrency(grossPreview)}</span>
                          </div>
                          <div className="col-6 col-sm-3">
                            <small className="text-muted d-block">Total Deductions</small>
                            <span className="font-monospace fw-semibold text-danger">-{formatCurrency(formData.deductions || 0)}</span>
                          </div>
                          <div className="col-6 col-sm-3">
                            <small className="text-muted d-block fw-bold">Calculated Net Pay</small>
                            <span className="font-monospace fw-bold fs-6 text-primary">{formatCurrency(netPreview)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowCreateModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm fw-bold px-3"
                    disabled={submitting}
                  >
                    {submitting ? "Creating Slip..." : "Create Salary Slip"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CREDIT MODAL */}
      {showCreditModal && selectedSalary && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-success d-flex align-items-center gap-2">
                  <i className="bi bi-check-circle-fill"></i> Credit Salary to Employee
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowCreditModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="mb-2">
                  Disbursing salary to: <strong>{selectedSalary.employee?.name}</strong> ({selectedSalary.employeeId})
                </p>
                <div className="p-3 rounded-3 border mb-3 bg-light-subtle">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted small">Month:</span>
                    <span className="fw-semibold small">{selectedSalary.salaryMonth}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted small">Net Disbursed:</span>
                    <span className="fw-bold font-monospace text-primary">{formatCurrency(selectedSalary.netSalary)}</span>
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="txRef" className="form-label fw-semibold small">
                    Bank / Transaction Reference
                  </label>
                  <input
                    id="txRef"
                    type="text"
                    className="form-control"
                    placeholder="e.g. TXN-109283741"
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                  />
                  <small className="text-muted">Unique payment bank wire or UPI reference</small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShowCreditModal(false)}
                  disabled={crediting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm fw-bold px-3"
                  onClick={handleCreditSalary}
                  disabled={crediting}
                >
                  {crediting ? "Disbursing..." : "Confirm & Mark Credited"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalaryHR;
