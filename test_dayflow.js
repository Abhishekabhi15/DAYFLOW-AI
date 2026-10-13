const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

async function runTests() {
  console.log("=== STARTING DAYFLOW HRMS COMPREHENSIVE VERIFICATION ===");
  
  // 1. Connect to MongoDB (Atlas or in-memory fallback)
  let mongoUri = sanitizeMongoUri(process.env.MONGO_URI);
  if (!mongoUri || !mongoUri.trim()) {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    mongoUri = mongod.getUri();
  }
  
  try {
    await mongoose.connect(mongoUri, { dbName: "dayflow" });
    console.log("✓ Connected to MongoDB database 'dayflow'");
  } catch (err) {
    console.warn("Primary MongoDB connection failed, using in-memory fallback:", err.message);
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: "dayflow" });
    console.log("✓ Connected to in-memory fallback database 'dayflow'");
  }

  const User = require("./records/user");
  const Leave = require("./records/leave");
  const Attendance = require("./records/attendance");
  const { seedAdmin } = require("./actions/authenticationActions");

  await seedAdmin();
  console.log("✓ Default admin, HR, and employee accounts verified/seeded");

  // Retrieve accounts
  const manager = await User.findOne({ role: "Admin" });
  const hr = await User.findOne({ role: "HR Officer" });
  const employee = await User.findOne({ role: "Employee" });

  console.log(`Found Manager: ${manager.name} (${manager.email})`);
  console.log(`Found HR: ${hr.name} (${hr.email})`);
  console.log(`Found Employee: ${employee.name} (${employee.email})`);

  const { updateLeave } = require("./controllers/leaveController");

  // TEST 1: Employee submits leave -> HR approves -> Success
  console.log("\n--- TEST 1: HR APPROVING EMPLOYEE LEAVE ---");
  const empLeave = await Leave.create({
    employee: employee._id,
    leaveType: "Paid",
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    remarks: "Family vacation",
    status: "Pending",
  });

  let mockRes = {
    statusCode: 200,
    data: null,
    status(c) { this.statusCode = c; return this; },
    json(d) { this.data = d; return this; }
  };

  await updateLeave(
    { params: { id: empLeave._id.toString() }, body: { status: "Approved", adminComment: "HR Approved" }, user: hr },
    mockRes
  );

  console.log(`HR approving Employee leave response: status=${mockRes.statusCode}`, mockRes.data?.status === "Approved" ? "✓ SUCCESS" : "✗ FAILED");
  if (mockRes.statusCode !== 200) throw new Error("HR could not approve employee leave");

  // TEST 2: HR submits leave -> HR attempts self-approval -> Must return 403
  console.log("\n--- TEST 2: HR ATTEMPTING TO APPROVE OWN LEAVE (MUST FAIL 403) ---");
  const hrLeave = await Leave.create({
    employee: hr._id,
    leaveType: "Sick",
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    remarks: "Medical leave",
    status: "Pending",
  });

  mockRes = {
    statusCode: 200,
    data: null,
    status(c) { this.statusCode = c; return this; },
    json(d) { this.data = d; return this; }
  };

  await updateLeave(
    { params: { id: hrLeave._id.toString() }, body: { status: "Approved", adminComment: "Self approve" }, user: hr },
    mockRes
  );

  console.log(`HR approving own leave response: status=${mockRes.statusCode}`, mockRes.statusCode === 403 ? "✓ 403 FORBIDDEN AS EXPECTED" : "✗ FAILED");
  if (mockRes.statusCode !== 403) throw new Error("HR was able to approve own leave");

  // TEST 3: HR attempts to approve another HR's leave (HR Officer leave) -> Must return 403
  console.log("\n--- TEST 3: HR ATTEMPTING TO APPROVE HR OFFICER LEAVE (MUST FAIL 403) ---");
  let hr2 = await User.findOne({ email: "hr2@dayflow.com" });
  if (!hr2) {
    hr2 = await User.create({
      employeeId: "HR002",
      name: "Second HR",
      email: "hr2@dayflow.com",
      password: "hash",
      role: "HR Officer",
      status: "Active",
      approvalStatus: "Approved",
    });
  }

  mockRes = {
    statusCode: 200,
    data: null,
    status(c) { this.statusCode = c; return this; },
    json(d) { this.data = d; return this; }
  };

  await updateLeave(
    { params: { id: hrLeave._id.toString() }, body: { status: "Approved", adminComment: "Peer HR approve" }, user: hr2 },
    mockRes
  );

  console.log(`HR2 approving HR1 leave response: status=${mockRes.statusCode}`, mockRes.data);
  if (mockRes.statusCode !== 403 || !mockRes.data?.message.includes("HR Officers cannot approve HR Officer leave requests")) {
    throw new Error("HR2 was able to approve HR1 leave or wrong message");
  }
  console.log("✓ CORRECTLY REJECTED WITH 403: 'HR Officers cannot approve HR Officer leave requests.'");

  // TEST 4: Manager approves HR Officer leave -> Must succeed
  console.log("\n--- TEST 4: MANAGER APPROVING HR OFFICER LEAVE ---");
  mockRes = {
    statusCode: 200,
    data: null,
    status(c) { this.statusCode = c; return this; },
    json(d) { this.data = d; return this; }
  };

  await updateLeave(
    { params: { id: hrLeave._id.toString() }, body: { status: "Approved", adminComment: "Manager granted" }, user: manager },
    mockRes
  );

  console.log(`Manager approving HR leave response: status=${mockRes.statusCode}`, mockRes.data?.status === "Approved" ? "✓ SUCCESS" : "✗ FAILED");
  if (mockRes.statusCode !== 200) throw new Error("Manager could not approve HR leave");

  // TEST 5: Manager attempts self-approval on Manager leave -> Must return 403
  console.log("\n--- TEST 5: MANAGER ATTEMPTING SELF-APPROVAL (MUST FAIL 403) ---");
  const mgrLeave = await Leave.create({
    employee: manager._id,
    leaveType: "Paid",
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    remarks: "Executive retreat",
    status: "Pending",
  });

  mockRes = {
    statusCode: 200,
    data: null,
    status(c) { this.statusCode = c; return this; },
    json(d) { this.data = d; return this; }
  };

  await updateLeave(
    { params: { id: mgrLeave._id.toString() }, body: { status: "Approved", adminComment: "Self approve" }, user: manager },
    mockRes
  );

  console.log(`Manager approving own leave response: status=${mockRes.statusCode}`, mockRes.statusCode === 403 ? "✓ 403 FORBIDDEN AS EXPECTED" : "✗ FAILED");
  if (mockRes.statusCode !== 403) throw new Error("Manager was able to approve own leave");

  // ATTENDANCE TESTS
  console.log("\n=== ATTENDANCE WORKFLOW TESTS ===");
  // Clean up any existing attendance for employee
  await Attendance.deleteMany({ employee: employee._id });

  // Load attendanceApi handlers
  const express = require("express");
  const attendanceRouter = require("./api/attendanceApi");

  // Helper to call express route handler directly
  const routes = attendanceRouter.stack;
  const getTodayHandler = routes.find(r => r.route?.path === "/today")?.route?.stack?.slice(-1)[0]?.handle;
  const checkInHandler = routes.find(r => r.route?.path === "/check-in")?.route?.stack?.slice(-1)[0]?.handle;
  const checkOutHandler = routes.find(r => r.route?.path === "/check-out")?.route?.stack?.slice(-1)[0]?.handle;

  // Step A: Initial state -> No attendance
  console.log("\n--- STEP A: INITIAL ATTENDANCE STATE (BEFORE CHECK-IN) ---");
  mockRes = { statusCode: 200, data: null, status(c) { this.statusCode = c; return this; }, json(d) { this.data = d; return this; } };
  await getTodayHandler({ user: employee }, mockRes);
  console.log("Initial today attendance:", mockRes.data === null ? "✓ NULL (Not Checked In)" : mockRes.data);

  // Step B: Check-in -> Active session (checkIn exists, checkOut null, status Present)
  console.log("\n--- STEP B: PERFORMING CHECK-IN ---");
  mockRes = { statusCode: 200, data: null, status(c) { this.statusCode = c; return this; }, json(d) { this.data = d; return this; } };
  await checkInHandler({ user: employee }, mockRes);
  console.log(`Check-in response: status=${mockRes.statusCode}`, {
    checkIn: mockRes.data?.checkIn,
    checkOut: mockRes.data?.checkOut,
    status: mockRes.data?.status
  });
  if (mockRes.statusCode !== 201 || !mockRes.data?.checkIn || mockRes.data?.checkOut !== null) {
    throw new Error("Check-in failed or checkOut is not null");
  }
  console.log("✓ CHECK-IN CREATED: checkIn is timestamp, checkOut is null, status is Present");

  // Step C: Verify /today returns the exact active session
  console.log("\n--- STEP C: GET /today ATTENDANCE RECORD ---");
  mockRes = { statusCode: 200, data: null, status(c) { this.statusCode = c; return this; }, json(d) { this.data = d; return this; } };
  await getTodayHandler({ user: employee }, mockRes);
  console.log("Today attendance query:", {
    checkIn: mockRes.data?.checkIn,
    checkOut: mockRes.data?.checkOut,
    status: mockRes.data?.status
  });
  if (!mockRes.data?.checkIn || mockRes.data?.checkOut !== null) {
    throw new Error("/today did not return active check-in with null checkOut");
  }
  console.log("✓ /today correctly returns checkIn timestamp and null checkOut");

  // Step D: Duplicate Check-In Attempt -> MUST FAIL
  console.log("\n--- STEP D: ATTEMPT DUPLICATE CHECK-IN (MUST REJECT) ---");
  mockRes = { statusCode: 200, data: null, status(c) { this.statusCode = c; return this; }, json(d) { this.data = d; return this; } };
  await checkInHandler({ user: employee }, mockRes);
  console.log(`Duplicate check-in response: status=${mockRes.statusCode}`, mockRes.data);
  if (mockRes.statusCode !== 400 || !mockRes.data?.message.includes("already checked in")) {
    throw new Error("Duplicate check-in was not properly rejected");
  }
  console.log("✓ DUPLICATE CHECK-IN REJECTED WITH 400: 'You are already checked in.'");

  // Step E: Checkout -> Completes session
  console.log("\n--- STEP E: PERFORMING CHECKOUT ---");
  mockRes = { statusCode: 200, data: null, status(c) { this.statusCode = c; return this; }, json(d) { this.data = d; return this; } };
  await checkOutHandler({ user: employee }, mockRes);
  console.log(`Check-out response: status=${mockRes.statusCode}`, {
    checkIn: mockRes.data?.checkIn,
    checkOut: mockRes.data?.checkOut,
    status: mockRes.data?.status
  });
  if (mockRes.statusCode !== 200 || !mockRes.data?.checkOut || mockRes.data?.status !== "Completed") {
    throw new Error("Check-out failed or status is not Completed");
  }
  console.log("✓ CHECK-OUT COMPLETED: checkOut timestamp recorded, status set to Completed");

  // Step F: Verify /today returns completed session
  console.log("\n--- STEP F: VERIFY /today AFTER CHECKOUT ---");
  mockRes = { statusCode: 200, data: null, status(c) { this.statusCode = c; return this; }, json(d) { this.data = d; return this; } };
  await getTodayHandler({ user: employee }, mockRes);
  console.log("Today attendance after checkout:", {
    checkIn: mockRes.data?.checkIn,
    checkOut: mockRes.data?.checkOut,
    status: mockRes.data?.status
  });
  if (!mockRes.data?.checkIn || !mockRes.data?.checkOut || mockRes.data?.status !== "Completed") {
    throw new Error("/today did not return Completed status with valid checkIn and checkOut");
  }
  console.log("✓ /today correctly reflects Completed status with checkIn and checkOut");

  // Step G: Subsequent Checkout Attempt -> MUST FAIL
  console.log("\n--- STEP G: SUBSEQUENT CHECKOUT ATTEMPT (MUST REJECT) ---");
  mockRes = { statusCode: 200, data: null, status(c) { this.statusCode = c; return this; }, json(d) { this.data = d; return this; } };
  await checkOutHandler({ user: employee }, mockRes);
  console.log(`Subsequent checkout response: status=${mockRes.statusCode}`, mockRes.data);
  if (mockRes.statusCode !== 400) {
    throw new Error("Subsequent checkout was not rejected");
  }
  console.log("✓ SUBSEQUENT CHECKOUT REJECTED WITH 400");

  // Step H: Subsequent Check-in Attempt -> MUST FAIL
  console.log("\n--- STEP H: SUBSEQUENT CHECK-IN ATTEMPT (MUST REJECT) ---");
  mockRes = { statusCode: 200, data: null, status(c) { this.statusCode = c; return this; }, json(d) { this.data = d; return this; } };
  await checkInHandler({ user: employee }, mockRes);
  console.log(`Subsequent check-in response: status=${mockRes.statusCode}`, mockRes.data);
  if (mockRes.statusCode !== 400) {
    throw new Error("Check-in after completed session was not rejected");
  }
  console.log("✓ CHECK-IN AFTER COMPLETED SESSION REJECTED WITH 400");

  console.log("\n=== ALL TEST CASES PASSED SUCCESSFULLY ===");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
