import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import ApplyLeave from "./pages/ApplyLeave";
import Profile from "./pages/Profile";
import EmployeeApprovals from "./pages/EmployeeApprovals";
import EmployeeManagement from "./pages/EmployeeManagement";
import EmployeeDirectory from "./pages/EmployeeDirectory";
import SalaryEmployee from "./pages/SalaryEmployee";
import SalaryHR from "./pages/SalaryHR";
import SalaryManager from "./pages/SalaryManager";
import ThemeToggle from "./components/ThemeToggle";

function AppContent() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [authTab, setAuthTab] = useState("login");

  // Keep tab consistent with role on login
  useEffect(() => {
    if (isAuthenticated) {
      setTab("dashboard");
    }
  }, [user?._id]);

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="spinner-border mb-3" style={{ color: "var(--accent-gold)", width: "3rem", height: "3rem" }} role="status">
          <span className="visually-hidden">Loading Dayflow HRMS...</span>
        </div>
        <h5 className="fw-bold">DAYFLOW HRMS</h5>
        <small className="text-muted">Loading enterprise workspace...</small>
      </div>
    );
  }

  const isManager = user?.role === "Admin";
  const isHR = user?.role === "HR Officer";
  const isEmployee = user?.role === "Employee";

  const getRoleDisplayName = () => {
    if (isManager) return "Manager";
    if (isHR) return "HR";
    return "Employee";
  };

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Top Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark navbar-custom">
        <div className="container-fluid px-3 px-lg-4">
          {/* Brand */}
          <a
            className="navbar-brand d-flex align-items-center gap-2 text-decoration-none me-3"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (isAuthenticated) setTab("dashboard");
            }}
          >
            <div className="brand-icon-box">
              <i className="bi bi-building-fill-check"></i>
            </div>
            <div>
              <div className="brand-title lh-1">DAYFLOW</div>
              <div className="brand-subtitle">HRMS Enterprise</div>
            </div>
          </a>

          {isAuthenticated ? (
            <div className="d-flex align-items-center flex-wrap gap-2 ms-auto">
              {/* Navigation Tabs based on Role */}
              <div className="d-flex gap-1 flex-wrap me-2">
                {/* 1. Dashboard (All) */}
                <button
                  type="button"
                  className={`btn nav-pill-btn ${tab === "dashboard" ? "active" : ""}`}
                  onClick={() => setTab("dashboard")}
                >
                  <i className="bi bi-speedometer2"></i>
                  <span>Dashboard</span>
                </button>

                {/* MANAGER SPECIFIC: Employee Approvals */}
                {isManager && (
                  <button
                    type="button"
                    className={`btn nav-pill-btn ${tab === "approvals" ? "active" : ""}`}
                    onClick={() => setTab("approvals")}
                  >
                    <i className="bi bi-shield-check"></i>
                    <span>Employee Approvals</span>
                  </button>
                )}

                {/* HR & MANAGER: Employee Directory */}
                {(isManager || isHR) && (
                  <button
                    type="button"
                    className={`btn nav-pill-btn ${tab === "employees" ? "active" : ""}`}
                    onClick={() => setTab("employees")}
                  >
                    <i className="bi bi-people"></i>
                    <span>Employees</span>
                  </button>
                )}

                {/* HR SPECIFIC: Employee Management (Creation) */}
                {isHR && (
                  <button
                    type="button"
                    className={`btn nav-pill-btn ${tab === "management" ? "active" : ""}`}
                    onClick={() => setTab("management")}
                  >
                    <i className="bi bi-person-plus-fill"></i>
                    <span>Employee Management</span>
                  </button>
                )}

                {/* Attendance (All) */}
                <button
                  type="button"
                  className={`btn nav-pill-btn ${tab === "attendance" ? "active" : ""}`}
                  onClick={() => setTab("attendance")}
                >
                  <i className="bi bi-calendar-check"></i>
                  <span>Attendance</span>
                </button>

                {/* Leaves (All) */}
                <button
                  type="button"
                  className={`btn nav-pill-btn ${tab === "leave" ? "active" : ""}`}
                  onClick={() => setTab("leave")}
                >
                  <i className="bi bi-file-earmark-text"></i>
                  <span>Leave</span>
                </button>

                {/* Salary: Role specific */}
                {isEmployee && (
                  <button
                    type="button"
                    className={`btn nav-pill-btn ${tab === "salary" ? "active" : ""}`}
                    onClick={() => setTab("salary")}
                  >
                    <i className="bi bi-wallet2"></i>
                    <span>Salary</span>
                  </button>
                )}

                {isHR && (
                  <button
                    type="button"
                    className={`btn nav-pill-btn ${tab === "salary_management" ? "active" : ""}`}
                    onClick={() => setTab("salary_management")}
                  >
                    <i className="bi bi-cash-stack"></i>
                    <span>Salary Management</span>
                  </button>
                )}

                {isManager && (
                  <button
                    type="button"
                    className={`btn nav-pill-btn ${tab === "salary_monitoring" ? "active" : ""}`}
                    onClick={() => setTab("salary_monitoring")}
                  >
                    <i className="bi bi-graph-up-arrow"></i>
                    <span>Salary Monitoring</span>
                  </button>
                )}

                {/* Profile (All) */}
                <button
                  type="button"
                  className={`btn nav-pill-btn ${tab === "profile" ? "active" : ""}`}
                  onClick={() => setTab("profile")}
                >
                  <i className="bi bi-person-circle"></i>
                  <span>Profile</span>
                </button>
              </div>

              {/* Theme Toggle & User Info & Logout */}
              <div className="d-flex align-items-center gap-2 border-start ps-3 border-secondary border-opacity-25 ms-auto">
                <ThemeToggle />

                <div className="text-end d-none d-md-block ms-1">
                  <div className="small fw-bold text-white lh-1">{user?.name}</div>
                  <span className="user-role-tag d-inline-block mt-1">
                    {getRoleDisplayName()}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-light border-0 d-flex align-items-center gap-1"
                  onClick={() => {
                    logout();
                    setAuthTab("login");
                  }}
                  title="Sign Out"
                >
                  <i className="bi bi-box-arrow-right fs-6"></i>
                  <span className="d-none d-lg-inline small">Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="d-flex align-items-center gap-2 ms-auto">
              <ThemeToggle />

              <button
                type="button"
                className={`btn nav-pill-btn ${authTab === "login" ? "active" : ""}`}
                onClick={() => setAuthTab("login")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`btn nav-pill-btn ${authTab === "admin" ? "active" : ""}`}
                onClick={() => setAuthTab("admin")}
              >
                <i className="bi bi-shield-lock-fill me-1"></i> Manager Portal
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="container-fluid px-3 px-lg-4 py-4 flex-grow-1">
        {isAuthenticated ? (
          <>
            {tab === "dashboard" && <Dashboard onNavigate={setTab} />}
            {tab === "approvals" && isManager && <EmployeeApprovals />}
            {tab === "employees" && (isManager || isHR) && <EmployeeDirectory />}
            {tab === "management" && isHR && <EmployeeManagement />}
            {tab === "attendance" && <Attendance />}
            {tab === "leave" && <ApplyLeave />}
            {tab === "salary" && isEmployee && <SalaryEmployee />}
            {tab === "salary_management" && isHR && <SalaryHR />}
            {tab === "salary_monitoring" && isManager && <SalaryManager />}
            {tab === "profile" && <Profile />}
          </>
        ) : (
          <>
            {authTab === "login" && (
              <Login
                onSwitchToAdmin={() => setAuthTab("admin")}
                onLoginSuccess={() => setTab("dashboard")}
              />
            )}
            {authTab === "admin" && (
              <AdminLogin
                onLoginSuccess={() => setTab("dashboard")}
                onSwitchToGeneralLogin={() => setAuthTab("login")}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        className="py-3 border-top mt-auto text-center small"
        style={{
          backgroundColor: "var(--surface-card)",
          borderColor: "var(--border-color)",
          color: "var(--text-secondary)",
        }}
      >
        <div className="container">
          &copy; {new Date().getFullYear()} Dayflow HRMS &bull; Enterprise Human Resource Management System
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
