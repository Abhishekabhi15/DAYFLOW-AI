import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function Register({ onSwitchToLogin, onRegisterSuccess }) {
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    employeeId: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "Employee", // Public registration strictly creates Employee accounts
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const passwordRules = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  };

  const strongPassword = Object.values(passwordRules).every(Boolean);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!formData.name.trim()) {
      setErrorMessage("Full Name is required.");
      return;
    }

    if (!formData.employeeId.trim()) {
      setErrorMessage("Employee ID is required.");
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage("Work Email is required.");
      return;
    }

    if (!strongPassword) {
      setErrorMessage("Please ensure your password meets all requirements.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.name.trim(),
        employeeId: formData.employeeId.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: "Employee",
      });

      setSuccessMessage("Account created successfully! Redirecting...");
      setTimeout(() => {
        if (onRegisterSuccess) {
          onRegisterSuccess();
        }
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: "560px" }}>
      <div className="card shadow border-0 rounded-4 overflow-hidden">
        {/* Card Header with Palette Gradient */}
        <div
          className="card-header p-4 text-center text-white"
          style={{
            background: "linear-gradient(135deg, #2F4858 0%, #116976 50%, #008A80 100%)",
            borderBottom: "4px solid #F4D14F",
          }}
        >
          <div
            className="d-inline-flex p-3 rounded-circle mb-2 shadow-sm"
            style={{ backgroundColor: "#F4D14F", color: "#2F4858" }}
          >
            <i className="bi bi-person-plus-fill fs-2"></i>
          </div>
          <h3 className="fw-bold mb-1 text-white">Create Employee Account</h3>
          <p className="mb-0 text-white-50 small">
            Register your employee profile to get started with Dayflow
          </p>
        </div>

        <div className="card-body p-4 p-md-5">
          {errorMessage && (
            <div
              className="alert alert-danger alert-dismissible fade show d-flex align-items-center gap-2"
              role="alert"
            >
              <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
              <div>{errorMessage}</div>
              <button
                type="button"
                className="btn-close ms-auto"
                onClick={() => setErrorMessage("")}
                aria-label="Close"
              ></button>
            </div>
          )}

          {successMessage && (
            <div
              className="alert alert-success d-flex align-items-center gap-2"
              role="alert"
            >
              <i className="bi bi-check-circle-fill flex-shrink-0"></i>
              <div>{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="mb-3">
              <label htmlFor="regName" className="form-label fw-semibold text-palette-navy">
                Full Name
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-person text-palette-teal"></i>
                </span>
                <input
                  id="regName"
                  type="text"
                  name="name"
                  className="form-control border-start-0 ps-0"
                  placeholder="e.g. Sarah Connor"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Employee ID */}
            <div className="mb-3">
              <label htmlFor="regEmployeeId" className="form-label fw-semibold text-palette-navy">
                Employee ID
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-card-heading text-palette-teal"></i>
                </span>
                <input
                  id="regEmployeeId"
                  type="text"
                  name="employeeId"
                  className="form-control border-start-0 ps-0"
                  placeholder="e.g. EMP101"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="mb-3">
              <label htmlFor="regEmail" className="form-label fw-semibold text-palette-navy">
                Work Email
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-envelope text-palette-teal"></i>
                </span>
                <input
                  id="regEmail"
                  type="email"
                  name="email"
                  className="form-control border-start-0 ps-0"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-3">
              <label htmlFor="regPassword" className="form-label fw-semibold text-palette-navy">
                Password
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-lock text-palette-teal"></i>
                </span>
                <input
                  id="regPassword"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="form-control border-start-0 border-end-0 ps-0"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>

              {/* Real-time Password Requirements */}
              {formData.password && (
                <div className="p-3 bg-light rounded-3 mt-2 border">
                  <small className="fw-semibold d-block text-muted mb-2">
                    Password requirements:
                  </small>
                  <div className="row g-1 small">
                    <div className={`col-6 ${passwordRules.length ? "text-success fw-bold" : "text-muted"}`}>
                      <i className={`bi ${passwordRules.length ? "bi-check-circle-fill text-success" : "bi-circle"} me-1`}></i>
                      8+ characters
                    </div>
                    <div className={`col-6 ${passwordRules.uppercase ? "text-success fw-bold" : "text-muted"}`}>
                      <i className={`bi ${passwordRules.uppercase ? "bi-check-circle-fill text-success" : "bi-circle"} me-1`}></i>
                      Uppercase (A-Z)
                    </div>
                    <div className={`col-6 ${passwordRules.lowercase ? "text-success fw-bold" : "text-muted"}`}>
                      <i className={`bi ${passwordRules.lowercase ? "bi-check-circle-fill text-success" : "bi-circle"} me-1`}></i>
                      Lowercase (a-z)
                    </div>
                    <div className={`col-6 ${passwordRules.number ? "text-success fw-bold" : "text-muted"}`}>
                      <i className={`bi ${passwordRules.number ? "bi-check-circle-fill text-success" : "bi-circle"} me-1`}></i>
                      Number (0-9)
                    </div>
                    <div className={`col-6 ${passwordRules.special ? "text-success fw-bold" : "text-muted"}`}>
                      <i className={`bi ${passwordRules.special ? "bi-check-circle-fill text-success" : "bi-circle"} me-1`}></i>
                      Special character
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="mb-4">
              <label htmlFor="regConfirmPassword" className="form-label fw-semibold text-palette-navy">
                Confirm Password
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-lock-fill text-palette-teal"></i>
                </span>
                <input
                  id="regConfirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  className="form-control border-start-0 border-end-0 ps-0"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  <i className={`bi ${showConfirmPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>

              {formData.confirmPassword && (
                <div className="mt-1">
                  {formData.password === formData.confirmPassword ? (
                    <small className="text-success fw-bold d-flex align-items-center gap-1">
                      <i className="bi bi-check-circle-fill"></i> Passwords match
                    </small>
                  ) : (
                    <small className="text-danger d-flex align-items-center gap-1">
                      <i className="bi bi-x-circle-fill"></i> Passwords do not match
                    </small>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary w-100 py-2.5 fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account <i className="bi bi-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          {/* Quick toggle to Login */}
          <div className="text-center mt-4 pt-3 border-top">
            <p className="text-muted small mb-0">
              Already have an account?{" "}
              <button
                type="button"
                className="btn btn-link text-decoration-none p-0 fw-bold"
                style={{ color: "#008A80" }}
                onClick={onSwitchToLogin}
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;