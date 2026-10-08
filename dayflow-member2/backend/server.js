const express = require("express");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());

app.use((request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, x-employee-id, Authorization");
  if (request.method === "OPTIONS") {
    return response.sendStatus(200);
  }
  next();
});

// Mock database for Member 2 Employee Module
const employees = {
  EMP001: {
    employeeId: "EMP001",
    name: "Employee User",
    email: "employee@example.com",
    phone: "+1 (555) 234-5678",
    address: "742 Evergreen Terrace, Springfield, OR 97477",
    department: "Engineering",
    designation: "Senior Software Engineer",
    joiningDate: "2023-03-15",
    salary: {
      basic: 6500,
      allowances: 1200,
      deductions: 450,
      netSalary: 7250
    },
    documents: [
      { id: 1, name: "Employment_Agreement.pdf", type: "Contract", uploadedDate: "2023-03-15" },
      { id: 2, name: "Government_ID_Proof.pdf", type: "ID Verification", uploadedDate: "2023-03-15" },
      { id: 3, name: "Degree_Certificate.pdf", type: "Education", uploadedDate: "2023-03-16" }
    ],
    profilePicture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    role: "employee"
  }
};

const attendanceRecords = {
  EMP001: {
    today: {
      id: 7,
      employeeId: "EMP001",
      date: new Date().toISOString().split("T")[0],
      checkIn: null,
      checkOut: null,
      status: "Not Checked In"
    },
    history: [
      { id: 1, employeeId: "EMP001", date: "2026-08-21", checkIn: "09:00 AM", checkOut: "05:45 PM", status: "Present" },
      { id: 2, employeeId: "EMP001", date: "2026-08-20", checkIn: "09:05 AM", checkOut: "06:00 PM", status: "Present" },
      { id: 3, employeeId: "EMP001", date: "2026-08-19", checkIn: "09:15 AM", checkOut: "01:30 PM", status: "Half-day" },
      { id: 4, employeeId: "EMP001", date: "2026-08-18", checkIn: "--", checkOut: "--", status: "Leave" },
      { id: 5, employeeId: "EMP001", date: "2026-08-17", checkIn: "08:55 AM", checkOut: "05:30 PM", status: "Present" }
    ]
  }
};

// Authentication Middleware
function authenticateEmployee(req, res, next) {
  const employeeId = req.headers["x-employee-id"] || (req.headers.authorization && req.headers.authorization.replace("Bearer ", ""));
  if (!employeeId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Missing employee credentials (provide 'x-employee-id' header or Bearer token)"
    });
  }

  const employee = employees[employeeId] || employees["EMP001"];
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: `Employee with ID '${employeeId}' not found`
    });
  }

  req.employee = employee;
  req.employeeId = employee.employeeId;
  next();
}

app.get("/", (request, response) => {
  response.json({
    success: true,
    message: "Dayflow HRMS - Member 2 Employee Module API is running",
    version: "1.0.0",
    endpoints: {
      employee: {
        getProfile: "GET /api/employee/profile",
        updateProfile: "PUT /api/employee/profile",
        updatePhoto: "POST /api/employee/profile/photo"
      },
      attendance: {
        checkIn: "POST /api/attendance/check-in",
        checkOut: "POST /api/attendance/check-out",
        dailyAttendance: "GET /api/attendance/daily",
        weeklyAttendance: "GET /api/attendance/weekly"
      }
    }
  });
});

app.get("/api/health", (request, response) => {
  response.json({
    status: "ok",
    message: "Dayflow Member 2 backend is running"
  });
});

// Employee Profile Endpoints
app.get("/api/employee/profile", authenticateEmployee, (req, res) => {
  res.json({
    success: true,
    message: "Employee profile retrieved successfully",
    data: req.employee
  });
});

app.put("/api/employee/profile", authenticateEmployee, (req, res) => {
  const { phone, address } = req.body;
  if (phone !== undefined) req.employee.phone = phone;
  if (address !== undefined) req.employee.address = address;

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: req.employee
  });
});

app.post("/api/employee/profile/photo", authenticateEmployee, (req, res) => {
  const { photoUrl, profilePicture } = req.body;
  const newPhoto = photoUrl || profilePicture;
  if (!newPhoto) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid photoUrl or profilePicture in the request body"
    });
  }

  req.employee.profilePicture = newPhoto;
  res.json({
    success: true,
    message: "Profile picture updated successfully",
    data: {
      profilePicture: newPhoto
    }
  });
});

// Attendance Endpoints
function formatTime(date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

app.get("/api/attendance/daily", authenticateEmployee, (req, res) => {
  const records = attendanceRecords[req.employeeId] || attendanceRecords["EMP001"];
  res.json({
    success: true,
    message: "Daily attendance retrieved successfully",
    today: records.today,
    history: records.history
  });
});

app.post("/api/attendance/check-in", authenticateEmployee, (req, res) => {
  const records = attendanceRecords[req.employeeId] || attendanceRecords["EMP001"];
  if (records.today.checkIn) {
    return res.status(400).json({
      success: false,
      message: `Already checked in for today at ${records.today.checkIn}`
    });
  }

  const now = new Date();
  records.today.checkIn = formatTime(now);
  records.today.status = "Present";

  res.json({
    success: true,
    message: `Check-in successful at ${records.today.checkIn}`,
    data: records.today
  });
});

app.post("/api/attendance/check-out", authenticateEmployee, (req, res) => {
  const records = attendanceRecords[req.employeeId] || attendanceRecords["EMP001"];
  if (!records.today.checkIn) {
    return res.status(400).json({
      success: false,
      message: "Cannot check out before checking in for today"
    });
  }
  if (records.today.checkOut) {
    return res.status(400).json({
      success: false,
      message: `Already checked out for today at ${records.today.checkOut}`
    });
  }

  const now = new Date();
  records.today.checkOut = formatTime(now);

  res.json({
    success: true,
    message: `Check-out successful at ${records.today.checkOut}`,
    data: records.today
  });
});

app.get("/api/attendance/weekly", authenticateEmployee, (req, res) => {
  const records = attendanceRecords[req.employeeId] || attendanceRecords["EMP001"];
  const days = [
    { dayName: "Monday", date: "2026-08-17", checkIn: "08:55 AM", checkOut: "05:30 PM", status: "Present", isToday: false },
    { dayName: "Tuesday", date: "2026-08-18", checkIn: "--", checkOut: "--", status: "Leave", isToday: false },
    { dayName: "Wednesday", date: "2026-08-19", checkIn: "09:15 AM", checkOut: "01:30 PM", status: "Half-day", isToday: false },
    { dayName: "Thursday", date: "2026-08-20", checkIn: "09:05 AM", checkOut: "06:00 PM", status: "Present", isToday: false },
    { dayName: "Friday", date: "2026-08-21", checkIn: "09:00 AM", checkOut: "05:45 PM", status: "Present", isToday: false },
    {
      dayName: "Saturday",
      date: records.today.date,
      checkIn: records.today.checkIn || "--",
      checkOut: records.today.checkOut || "--",
      status: records.today.status,
      isToday: true
    },
    { dayName: "Sunday", date: "2026-08-23", checkIn: "--", checkOut: "--", status: "Weekend", isToday: false }
  ];

  res.json({
    success: true,
    message: "Weekly attendance retrieved successfully",
    weekSummary: {
      presentDays: 4.5,
      totalWorkingDays: 5,
      attendancePercentage: 90
    },
    data: days
  });
});

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found on server`
  });
});

app.listen(PORT, () => {
  console.log(`Dayflow Member 2 backend running on http://localhost:${PORT}`);
});
