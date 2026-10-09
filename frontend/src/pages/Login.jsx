import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export function Login({ onSwitchToAdmin, onLoginSuccess }) {
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password) {
      setErrorMessage("Please enter both work email/ID and password.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      await login(formData.email.trim(), formData.password);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      setErrorMessage(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: "460px" }}>
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
        {/* Header with Dark Premium Styling */}
        <div
          className="p-4 text-center text-white"
          style={{
            backgroundColor: "#111111",
            borderBottom: "2px solid var(--accent-gold)",
          }}
        >
          <div
            className="d-inline-flex p-3 rounded-3 mb-2 shadow"
            style={{
              backgroundColor: "#1E1E1E",
              color: "var(--accent-gold)",
              border: "1px solid rgba(181, 154, 97, 0.4)",
            }}
          >
            <i className="bi bi-building-fill-check fs-2"></i>
          </div>
          <h4 className="fw-bold mb-1 text-white">DAYFLOW HRMS</h4>
          <p className="mb-0 text-white-50 small">
            Sign in to access your HR workspace
          </p>
        </div>

        <div className="card-body p-4 p-md-5">
          {errorMessage && (
            <div
              className="alert alert-danger alert-dismissible fade show d-flex align-items-center gap-2 mb-4"
              role="alert"
            >
              <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
              <div className="small">{errorMessage}</div>
              <button
                type="button"
                className="btn-close ms-auto"
                onClick={() => setErrorMessage("")}
                aria-label="Close"
              ></button>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Email / Employee ID Field */}
            <div className="mb-3">
              <label htmlFor="loginEmail" className="form-label fw-semibold small">
                Work Email or Employee ID
              </label>
              <div className="input-group">
                <span className="input-group-text border-end-0">
                  <i className="bi bi-person-badge text-muted"></i>
                </span>
                <input
                  id="loginEmail"
                  type="text"
                  name="email"
                  className="form-control border-start-0 ps-0"
                  placeholder="employee@dayflow.com or EMP001"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="loginPassword" className="form-label fw-semibold small mb-0">
                  Password
                </label>
              </div>
              <div className="input-group">
                <span className="input-group-text border-end-0">
                  <i className="bi bi-lock text-muted"></i>
                </span>
                <input
                  id="loginPassword"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="form-control border-start-0 border-end-0 ps-0"
                  placeholder="Enter account password"
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
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In <i className="bi bi-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          {/* Quick Manager Portal Switcher */}
          {onSwitchToAdmin && (
            <div className="text-center mt-4 pt-3 border-top">
              <p className="small text-muted mb-2">Manager or Executive Leadership?</p>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-pill px-3 fw-semibold"
                onClick={onSwitchToAdmin}
              >
                <i className="bi bi-shield-lock me-1" style={{ color: "var(--accent-gold)" }}></i>
                Access Manager Portal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
