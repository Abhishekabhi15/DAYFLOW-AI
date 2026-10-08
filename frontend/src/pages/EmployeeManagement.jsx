import React, { useState, useEffect } from "react";
import { employeeApi } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export function EmployeeManagement() {
  const [activeTab, setActiveTab] = useState("create"); // 'create' or 'list'
  const [formData, setFormData] = useState({
    employeeId: "",
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    department: "Engineering",
    designation: "Software Engineer",
    joiningDate: new Date().toISOString().split("T")[0],
    initialSalary: "",
  });

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const departments = [
    "Engineering",
    "Product & Design",
    "People Operations",
    "Finance & Accounts",
    "Sales & Marketing",
    "Customer Success",
    "Legal & Compliance",
  ];

  const fetchEmployees = async () => {
    setListLoading(true);
    try {
      const data = await employeeApi.getEmployees();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to fetch employee list:", err.message);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.employeeId.trim() || !formData.name.trim() || !formData.email.trim() || !formData.password) {
      setError("Please fill in all required fields (Employee ID, Name, Email, Password).");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        employeeId: formData.employeeId.trim().toUpperCase(),
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
      };

      const res = await employeeApi.createEmployee(payload);
      setSuccess(
        res.message ||
          `Employee record for ${formData.name} created! Status: Pending Approval by Manager.`
      );

      // Reset form
      setFormData({
        employeeId: "",
        name: "",
        email: "",
        password: "",
        phone: "",
        address: "",
        department: "Engineering",
        designation: "Software Engineer",
        joiningDate: new Date().toISOString().split("T")[0],
        initialSalary: "",
      });

      fetchEmployees();
    } catch (err) {
      setError(err.message || "Failed to create employee account.");
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="h4 fw-bold mb-1 section-title">Employee Management</h2>
          <p className="text-muted mb-0 mt-1">
            Create new employee records and submit onboarding profiles for Manager review.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="btn-group p-1 bg-white border rounded-3 shadow-sm">
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "create" ? "btn-primary" : "btn-light text-muted border-0"}`}
            onClick={() => setActiveTab("create")}
          >
            <i className="bi bi-person-plus-fill me-1"></i> Onboard Employee
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "list" ? "btn-primary" : "btn-light text-muted border-0"}`}
            onClick={() => {
              setActiveTab("list");
              fetchEmployees();
            }}
          >
            <i className="bi bi-card-list me-1"></i> Staff Records ({employees.length})
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

      {/* Workflow Information Banner */}
      <div
        className="card shadow-sm border-0 mb-4"
        style={{
          borderLeft: "4px solid var(--accent-gold) !important",
          backgroundColor: "var(--surface-muted)",
        }}
      >
        <div className="card-body p-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="p-2 rounded-2 text-center"
              style={{ backgroundColor: "var(--accent-gold-subtle)", color: "var(--accent-gold)" }}
            >
              <i className="bi bi-diagram-3-fill fs-5"></i>
            </div>
            <div className="small">
              <span className="fw-bold text-primary">Onboarding Approval Pipeline: </span>
              <span className="text-muted">
                HR initiates new employee registration &rarr; Record set to <strong>Pending Approval</strong> &rarr; Manager reviews and Approves or Rejects &rarr; Account activated upon Approval.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: CREATE NEW EMPLOYEE */}
      {activeTab === "create" && (
        <div className="card shadow-sm border-0">
          <div className="card-header py-3">
            <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-person-plus text-primary fs-5"></i>
              New Employee Registration Form
            </h5>
          </div>

          <div className="card-body p-4">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {/* Employee ID */}
                <div className="col-md-6 col-lg-3">
                  <label htmlFor="empId" className="form-label fw-semibold small">
                    Employee ID <span className="text-danger">*</span>
                  </label>
                  <input
                    id="empId"
                    type="text"
                    name="employeeId"
                    className="form-control"
                    placeholder="e.g. EMP105"
                    value={formData.employeeId}
                    onChange={handleChange}
                    required
                  />
                  <small className="text-muted">Unique organization identifier</small>
                </div>

                {/* Full Name */}
                <div className="col-md-6 col-lg-5">
                  <label htmlFor="empName" className="form-label fw-semibold small">
                    Full Legal Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="empName"
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="e.g. Eleanor Vance"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Email */}
                <div className="col-md-6 col-lg-4">
                  <label htmlFor="empEmail" className="form-label fw-semibold small">
                    Work Email Address <span className="text-danger">*</span>
                  </label>
                  <input
                    id="empEmail"
                    type="email"
                    name="email"
                    className="form-control"
                    placeholder="eleanor@dayflow.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Phone */}
                <div className="col-md-6 col-lg-3">
                  <label htmlFor="empPhone" className="form-label fw-semibold small">
                    Contact Phone Number
                  </label>
                  <input
                    id="empPhone"
                    type="tel"
                    name="phone"
                    className="form-control"
                    placeholder="+1 (555) 234-5678"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                {/* Department */}
                <div className="col-md-6 col-lg-3">
                  <label htmlFor="empDept" className="form-label fw-semibold small">
                    Assigned Department <span className="text-danger">*</span>
                  </label>
                  <select
                    id="empDept"
                    name="department"
                    className="form-select"
                    value={formData.department}
                    onChange={handleChange}
                    required
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Designation */}
                <div className="col-md-6 col-lg-3">
                  <label htmlFor="empDesig" className="form-label fw-semibold small">
                    Designation / Title <span className="text-danger">*</span>
                  </label>
                  <input
                    id="empDesig"
                    type="text"
                    name="designation"
                    className="form-control"
                    placeholder="e.g. Lead Designer"
                    value={formData.designation}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Joining Date */}
                <div className="col-md-6 col-lg-3">
                  <label htmlFor="empJoin" className="form-label fw-semibold small">
                    Official Joining Date <span className="text-danger">*</span>
                  </label>
                  <input
                    id="empJoin"
                    type="date"
                    name="joiningDate"
                    className="form-control"
                    value={formData.joiningDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Initial Basic Salary */}
                <div className="col-md-6 col-lg-4">
                  <label htmlFor="empSalary" className="form-label fw-semibold small">
                    Initial Basic Salary (₹ / Month)
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      id="empSalary"
                      type="number"
                      name="initialSalary"
                      min="0"
                      className="form-control"
                      placeholder="e.g. 50000"
                      value={formData.initialSalary}
                      onChange={handleChange}
                    />
                  </div>
                  <small className="text-muted">Generates monthly salary record upon creation</small>
                </div>

                {/* Initial Portal Password */}
                <div className="col-md-6 col-lg-4">
                  <label htmlFor="empPass" className="form-label fw-semibold small">
                    Initial Portal Password <span className="text-danger">*</span>
                  </label>
                  <input
                    id="empPass"
                    type="password"
                    name="password"
                    className="form-control"
                    placeholder="Temporary employee password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <small className="text-muted">Employee can change upon initial login</small>
                </div>

                {/* Residential Address */}
                <div className="col-12 col-lg-4">
                  <label htmlFor="empAddress" className="form-label fw-semibold small">
                    Residential Address
                  </label>
                  <input
                    id="empAddress"
                    type="text"
                    name="address"
                    className="form-control"
                    placeholder="e.g. 104 Park Avenue, Suite 400"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() =>
                    setFormData({
                      employeeId: "",
                      name: "",
                      email: "",
                      password: "",
                      phone: "",
                      address: "",
                      department: "Engineering",
                      designation: "Software Engineer",
                      joiningDate: new Date().toISOString().split("T")[0],
                      initialSalary: "",
                    })
                  }
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm px-4 fw-bold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Submitting Record...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send-check me-1"></i> Submit for Approval
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF LIST */}
      {activeTab === "list" && (
        <div className="card shadow-sm border-0">
          <div className="card-header py-3 d-flex justify-content-between align-items-center">
            <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-people text-primary fs-5"></i>
              Organization Staff Directory ({employees.length})
            </h5>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3"
              onClick={fetchEmployees}
            >
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </button>
          </div>

          <div className="card-body p-0">
            {listLoading ? (
              <div className="empty-state-box">
                <div className="spinner-border text-secondary mb-3" role="status"></div>
                <p className="mb-0">Loading employee list...</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="empty-state-box">
                <i className="bi bi-people empty-state-icon"></i>
                <p className="mb-0">No employee records registered yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Joining Date</th>
                      <th>Approval Status</th>
                      <th>System Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp._id}>
                        <td>
                          <div className="fw-bold">{emp.name}</div>
                          <small className="text-muted font-monospace">{emp.employeeId} &bull; {emp.email}</small>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {emp.role === "Admin" ? "Manager" : emp.role}
                          </span>
                        </td>
                        <td className="small">{emp.department || "General"}</td>
                        <td className="small">{emp.designation || "Staff"}</td>
                        <td className="small text-muted">{formatDate(emp.joiningDate)}</td>
                        <td>
                          <StatusBadge status={emp.approvalStatus || "Approved"} />
                        </td>
                        <td>
                          <StatusBadge status={emp.status || "Active"} />
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

export default EmployeeManagement;
