require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authenticationApi = require("./api/authenticationApi");
const dashboardRoutes = require("./routes/dashboardRoutes");
const attendanceApi = require("./api/attendanceApi");
const leaveApi = require("./api/leaveApi");
const employeeApi = require("./api/employeeApi");
const salaryApi = require("./api/salaryApi");

const { seedAdmin } = require("./actions/authenticationActions");

const app = express();

const PORT = 3000;

app.use(cors());
app.use(express.json());

// API health endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Dayflow HRMS API is running smoothly",
    timestamp: new Date(),
  });
});

// Mount modular API routers
app.use("/api/auth", authenticationApi);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/attendance", attendanceApi);
app.use("/api/leave", leaveApi);
app.use("/api/employees", employeeApi);
app.use("/api/salaries", salaryApi);

// Global Error Handler for API routes
app.use("/api", (err, req, res, next) => {
  console.error("[HRMS API Error]", err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "An unexpected error occurred on the server.",
  });
});

// Catch-all 404 for unmatched /api requests (ensures JSON response, never HTML)
app.use("/api", (req, res) => {
  res.status(404).json({
    message: `API endpoint '${req.method} ${req.originalUrl}' not found.`,
  });
});

// Serve frontend static build
const frontendDistPath = path.join(__dirname, "frontend", "dist");
app.use(express.static(frontendDistPath));

// SPA fallback for non-API client-side routing
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: `API route '${req.originalUrl}' not found.` });
  }
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

// Database connection & startup sequence
async function startServer() {
  let mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    try {
      console.log("No MONGO_URI specified, initializing in-memory Mongo instance...");
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      console.log("In-memory MongoDB initialized successfully.");
    } catch (memErr) {
      console.warn("Could not start MongoMemoryServer:", memErr.message);
      mongoUri = "mongodb://127.0.0.1:27017/dayflow";
    }
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully.");

    // Seed default administrative & sample accounts
    await seedAdmin();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Dayflow HRMS server running on http://0.0.0.0:${PORT}`);
    });

    // Also bind port 5001 for local Vite dev compatibility
    if (PORT !== 5001) {
      try {
        const localServer = app.listen(5001, "0.0.0.0", () => {
          console.log(`Dayflow HRMS local API endpoint also available on http://0.0.0.0:5001`);
        });
        localServer.on("error", (err) => {
          if (err.code !== "EADDRINUSE") {
            console.warn("Port 5001 notice:", err.message);
          }
        });
      } catch (portErr) {
        // Port 5001 notice
      }
    }
  } catch (error) {
    console.error("Failed to connect to primary MongoDB URI, attempting fallback:", error.message);
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongod = await MongoMemoryServer.create();
      await mongoose.connect(mongod.getUri());
      console.log("Fallback MongoDB connected.");
      await seedAdmin();
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Dayflow HRMS server running on http://0.0.0.0:${PORT}`);
      });
    } catch (fallbackErr) {
      console.error("Fatal: MongoDB connection totally failed:", fallbackErr.message);
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Dayflow HRMS running in offline mode on port ${PORT}`);
      });
    }
  }
}

startServer();
