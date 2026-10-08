const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api";

/**
 * Core HTTP request handler
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = {
    ...(options.headers || {}),
  };

  const token = localStorage.getItem("token");
  if (token && !headers["Authorization"] && !headers["authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type");
    let data = null;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      const errorMessage =
        data?.message ||
        data?.error ||
        `Request failed with status ${response.status} (${response.statusText})`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      const netError = new Error(
        "Unable to connect to backend server. Please verify the server is running."
      );
      netError.status = 0;
      throw netError;
    }
    throw error;
  }
}

// ----------------------------------------------------
// Authentication API
// ----------------------------------------------------
export const authApi = {
  register: (userData) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  login: (credentials) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  getMe: () =>
    request("/auth/me", {
      method: "GET",
    }),

  updateProfile: (profileData) =>
    request("/auth/me", {
      method: "PUT",
      body: JSON.stringify(profileData),
    }),
};

// ----------------------------------------------------
// Dashboard API
// ----------------------------------------------------
export const dashboardApi = {
  getAdminDashboard: () =>
    request("/dashboard/admin", {
      method: "GET",
    }),
};

// ----------------------------------------------------
// Attendance API
// ----------------------------------------------------
export const attendanceApi = {
  checkIn: () =>
    request("/attendance/check-in", {
      method: "POST",
    }),

  checkOut: () =>
    request("/attendance/check-out", {
      method: "POST",
    }),

  getAttendance: (status = "") => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return request(`/attendance${query}`, {
      method: "GET",
    });
  },
};

// ----------------------------------------------------
// Leave API
// ----------------------------------------------------
export const leaveApi = {
  applyLeave: (leaveData) =>
    request("/leave", {
      method: "POST",
      body: JSON.stringify(leaveData),
    }),

  getLeaves: () =>
    request("/leave", {
      method: "GET",
    }),

  updateLeave: (id, { status, adminComment }) =>
    request(`/leave/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, adminComment }),
    }),
};

// ----------------------------------------------------
// Employee API (HR Creation, Directory, Manager Approvals)
// ----------------------------------------------------
export const employeeApi = {
  createEmployee: (data) =>
    request("/employees", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getEmployees: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
    ).toString();
    return request(`/employees${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },

  getPendingEmployees: () =>
    request("/employees/pending", {
      method: "GET",
    }),

  getEmployee: (id) =>
    request(`/employees/${id}`, {
      method: "GET",
    }),

  approveEmployee: (id) =>
    request(`/employees/${id}/approve`, {
      method: "PATCH",
    }),

  rejectEmployee: (id, rejectionReason) =>
    request(`/employees/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ rejectionReason }),
    }),

  updateEmployee: (id, data) =>
    request(`/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ----------------------------------------------------
// Salary API (Employee, HR, Manager)
// ----------------------------------------------------
export const salaryApi = {
  getMySalary: () =>
    request("/salaries/my", {
      method: "GET",
    }),

  getSalaries: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
    ).toString();
    return request(`/salaries${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },

  getEmployeeSalary: (employeeId) =>
    request(`/salaries/${employeeId}`, {
      method: "GET",
    }),

  createSalary: (data) =>
    request("/salaries", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateSalary: (id, data) =>
    request(`/salaries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  creditSalary: (id, data = {}) =>
    request(`/salaries/${id}/credit`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ----------------------------------------------------
// Health Check API
// ----------------------------------------------------
export const healthApi = {
  checkHealth: () =>
    request("/health", {
      method: "GET",
    }),
};

export default {
  auth: authApi,
  dashboard: dashboardApi,
  attendance: attendanceApi,
  leave: leaveApi,
  employee: employeeApi,
  salary: salaryApi,
  health: healthApi,
};
