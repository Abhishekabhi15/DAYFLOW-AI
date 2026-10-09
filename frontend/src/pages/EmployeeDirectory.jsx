import React, { useState, useEffect } from "react";
import { employeeApi } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export function EmployeeDirectory() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [approvalFilter, setApprovalFilter] = useState("All");

  // Detail Modal
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const fetchEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await employeeApi.getEmployees({
        search,
        department: departmentFilter !== "All" ? departmentFilter : undefined,
        status: statusFilter !== "All" ? statusFilter : undefined,
        approvalStatus: approvalFilter !== "All" ? approvalFilter : undefined,
      });
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load employee directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [departmentFilter, statusFilter, approvalFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEmployees();
  };

  const departments = [
    "All",
    "Engineering",
    "Product & Design",
    "People Operations",
    "Finance & Accounts",
    "Sales & Marketing",
    "Customer Success",
    "Executive Management",
  ];

  const formatDate = (d) => {
    if (!d) return "--";
    try {
      return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 className="h4 fw-bold mb-1 section-title">Employee Directory</h2>
          <p className="text-muted mb-0 mt-1">
            Browse and search active, pending, and archived personnel across all departments.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm px-3 d-flex align-items-center gap-1"
          onClick={fetchEmployees}
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

      {/* Search and Filter Bar */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <form onSubmit={handleSearchSubmit}>
            <div className="row g-2 align-items-center">
              {/* Search input */}
              <div className="col-12 col-md-5">
                <div className="input-group input-group-sm">
                  <span className="input-group-text border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search by name, ID, email, role..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm px-3">
                    Search
                  </button>
                </div>
              </div>

              {/* Department Filter */}
              <div className="col-6 col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept === "All" ? "All Departments" : dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="col-6 col-md-2">
                <select
                  className="form-select form-select-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Approval Filter */}
              <div className="col-12 col-md-2">
                <select
                  className="form-select form-select-sm"
                  value={approvalFilter}
                  onChange={(e) => setApprovalFilter(e.target.value)}
                >
                  <option value="All">All Approvals</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Directory Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-person-badge text-primary fs-5"></i>
            Personnel Records ({employees.length})
          </h5>
          <span className="small text-muted">
            Showing all matching staff members
          </span>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="empty-state-box">
              <div className="spinner-border text-secondary mb-3" role="status"></div>
              <p className="mb-0">Searching personnel...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="empty-state-box">
              <i className="bi bi-person-x empty-state-icon"></i>
              <h6 className="fw-bold">No Personnel Found</h6>
              <p className="small text-muted mb-0">
                No employee records match the selected filter criteria. Try resetting filters.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Employee ID</th>
                    <th>Name & Contact</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Joining Date</th>
                    <th>System Role</th>
                    <th>Approval</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp._id}>
                      <td>
                        <span className="badge bg-secondary-subtle text-secondary font-monospace">
                          {emp.employeeId}
                        </span>
                      </td>
                      <td>
                        <div className="fw-bold">{emp.name}</div>
                        <small className="text-muted">{emp.email}</small>
                      </td>
                      <td className="small">{emp.department || "General"}</td>
                      <td className="small">{emp.designation || "Employee"}</td>
                      <td className="small text-muted">{formatDate(emp.joiningDate)}</td>
                      <td>
                        <span className="user-role-tag">
                          {emp.role === "Admin" ? "Manager" : emp.role}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={emp.approvalStatus || "Approved"} />
                      </td>
                      <td>
                        <StatusBadge status={emp.status || "Active"} />
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => setSelectedEmployee(emp)}
                        >
                          <i className="bi bi-eye"></i> View
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

      {/* DETAIL MODAL */}
      {selectedEmployee && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-person-vcard text-primary"></i>
                  Personnel Record: {selectedEmployee.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setSelectedEmployee(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Employee ID</small>
                    <strong className="font-monospace fs-6">{selectedEmployee.employeeId}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Full Legal Name</small>
                    <strong className="fs-6">{selectedEmployee.name}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Work Email</small>
                    <strong className="text-break">{selectedEmployee.email}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Department</small>
                    <strong>{selectedEmployee.department || "General"}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Designation</small>
                    <strong>{selectedEmployee.designation || "Staff"}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Official Joining Date</small>
                    <strong>{formatDate(selectedEmployee.joiningDate)}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Contact Phone</small>
                    <strong>{selectedEmployee.phone || "Not specified"}</strong>
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Approval Status</small>
                    <StatusBadge status={selectedEmployee.approvalStatus || "Approved"} />
                  </div>
                  <div className="col-sm-6 col-md-4">
                    <small className="text-muted d-block">Account Status</small>
                    <StatusBadge status={selectedEmployee.status || "Active"} />
                  </div>
                  <div className="col-12">
                    <small className="text-muted d-block">Residential Address</small>
                    <p className="mb-0 text-secondary">{selectedEmployee.address || "Not specified"}</p>
                  </div>
                  {selectedEmployee.rejectionReason && (
                    <div className="col-12">
                      <div className="alert alert-danger mb-0 small">
                        <strong>Rejection Reason:</strong> {selectedEmployee.rejectionReason}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setSelectedEmployee(null)}
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeDirectory;
