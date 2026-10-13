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

const PORT = process.env.PORT || 3000;

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

function sanitizeMongoUri(uri) {
  if (!uri || typeof uri !== "string") return uri;
  try {
    const protocolMatch = uri.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/);
    if (!protocolMatch) return uri;
    const protocol = protocolMatch[1];
    const rest = protocolMatch[2];
    const lastAtIndex = rest.lastIndexOf("@");
    if (lastAtIndex === -1) return uri;
    const authPart = rest.slice(0, lastAtIndex);
    const hostPart = rest.slice(lastAtIndex + 1);
    const colonIndex = authPart.indexOf(":");
    if (colonIndex !== -1) {
      const username = authPart.slice(0, colonIndex);
      const password = authPart.slice(colonIndex + 1);
      const encodedUser = encodeURIComponent(decodeURIComponent(username));
      const encodedPass = encodeURIComponent(decodeURIComponent(password));
      return `${protocol}${encodedUser}:${encodedPass}@${hostPart}`;
    }
  } catch (err) {
    return uri;
  }
  return uri;
}

// Database connection & startup sequence
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  const rawMongoUri = process.env.MONGO_URI;

  if (isProduction && (!rawMongoUri || !rawMongoUri.trim())) {
    console.error("FATAL ERROR: MONGO_URI environment variable is required in production mode.");
    process.exit(1);
  }

  let mongoUri = sanitizeMongoUri(rawMongoUri);

  if (!mongoUri || !mongoUri.trim()) {
    try {
      console.log("No MONGO_URI specified in development, initializing in-memory Mongo instance...");
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
    await mongoose.connect(mongoUri, { dbName: "dayflow" });
    console.log("Connected to MongoDB successfully (database: dayflow).");

    // Seed default administrative & sample accounts
    await seedAdmin();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Dayflow HRMS server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    if (isProduction) {
      console.error("FATAL ERROR: Failed to connect to MongoDB in production:", error.message);
      process.exit(1);
    }

    console.error("Failed to connect to primary MongoDB URI, attempting development fallback:", error.message);
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongod = await MongoMemoryServer.create();
      await mongoose.connect(mongod.getUri(), { dbName: "dayflow" });
      console.log("Development fallback MongoDB connected.");
      await seedAdmin();
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Dayflow HRMS server running on http://0.0.0.0:${PORT}`);
      });
    } catch (fallbackErr) {
      console.error("Fatal: MongoDB connection totally failed:", fallbackErr.message);
      process.exit(1);
    }
  }
}

startServer();
