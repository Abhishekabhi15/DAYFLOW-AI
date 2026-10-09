const express = require("express");
const Attendance = require("../records/attendance");
const { authenticate } = require("../access/authentication");

const router = express.Router();

/**
 * Helper to compute start and end of day in consistent timezone
 */
const getDayBounds = (baseDate = new Date()) => {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * GET /api/attendance/today
 * Returns single authoritative current-day session for authenticated user
 */
router.get("/today", authenticate, async (req, res) => {
  try {
    const { start, end } = getDayBounds();

    // Look for today's record OR an active check-in session with no checkout
    let record = await Attendance.findOne({
      employee: req.user._id,
      $or: [
        { date: { $gte: start, $lte: end } },
        { checkIn: { $gte: start, $lte: end } },
        { checkIn: { $exists: true, $ne: null }, checkOut: null },
      ],
    })
      .populate("employee", "employeeId name department designation role")
      .sort({ checkIn: -1, createdAt: -1 });

    if (record) {
      const doc = record.toObject ? record.toObject() : record;
      if (doc.checkIn && !doc.checkOut) {
        doc.status = "In Progress";
      } else if (doc.checkIn && doc.checkOut) {
        doc.status = "Completed";
      }
      return res.json(doc);
    }

    res.json(null);
  } catch (error) {
    console.error("Get today attendance error:", error.message);
    res.status(500).json({ message: "Could not retrieve today's attendance record." });
  }
});

/**
 * POST /api/attendance/check-in
 * Initiates work session. Rejects duplicate active check-ins.
 */
router.post("/check-in", authenticate, async (req, res) => {
  try {
    const { start, end } = getDayBounds();

    // 1. Check if user is currently checked in without checking out
    const activeSession = await Attendance.findOne({
      employee: req.user._id,
      checkIn: { $exists: true, $ne: null },
      checkOut: null,
    });

    if (activeSession) {
      return res.status(400).json({
        message: "You are already checked in.",
      });
    }

    // 2. Check if user already has an attendance record for today
    const existingToday = await Attendance.findOne({
      employee: req.user._id,
      $or: [
        { date: { $gte: start, $lte: end } },
        { checkIn: { $gte: start, $lte: end } },
      ],
    });

    if (existingToday) {
      if (!existingToday.checkOut) {
        return res.status(400).json({
          message: "You are already checked in.",
        });
      } else {
        return res.status(400).json({
          message: "You have already completed your attendance session for today.",
        });
      }
    }

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.create({
      employee: req.user._id,
      date: todayDate,
      checkIn: new Date(),
      checkOut: null,
      status: "In Progress",
    });

    const populated = await Attendance.findById(attendance._id).populate(
      "employee",
      "employeeId name department designation role"
    );

    res.status(201).json(populated);
  } catch (error) {
    console.error("Check-in error:", error.message);
    res.status(500).json({
      message: error.message || "Failed to log check-in.",
    });
  }
});

/**
 * POST /api/attendance/check-out
 * Concludes work session. Sets status to Completed.
 */
router.post("/check-out", authenticate, async (req, res) => {
  try {
    const { start, end } = getDayBounds();

    // 1. Find active session (checkIn exists and checkOut is null)
    let attendance = await Attendance.findOne({
      employee: req.user._id,
      checkIn: { $exists: true, $ne: null },
      checkOut: null,
    }).sort({ checkIn: -1 });

    if (!attendance) {
      // Check if user already checked out today
      const alreadyCheckedOut = await Attendance.findOne({
        employee: req.user._id,
        $or: [
          { date: { $gte: start, $lte: end } },
          { checkIn: { $gte: start, $lte: end } },
        ],
        checkOut: { $exists: true, $ne: null },
      });

      if (alreadyCheckedOut) {
        return res.status(400).json({
          message: "Already checked out today.",
        });
      }

      return res.status(400).json({
        message: "You must check in before checking out.",
      });
    }

    attendance.checkOut = new Date();
    attendance.status = "Completed";
    await attendance.save();

    const populated = await Attendance.findById(attendance._id).populate(
      "employee",
      "employeeId name department designation role"
    );

    res.json(populated);
  } catch (error) {
    console.error("Check-out error:", error.message);
    res.status(500).json({
      message: error.message || "Failed to log check-out.",
    });
  }
});

/**
 * GET /api/attendance
 * Retrieves attendance logs
 */
router.get("/", authenticate, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "Employee") {
      filter.employee = req.user._id;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const attendance = await Attendance.find(filter)
      .populate("employee", "employeeId name department designation role")
      .sort({ date: -1, checkIn: -1 });

    const sanitized = attendance.map((item) => {
      const doc = item.toObject ? item.toObject() : { ...item };
      if (doc.checkIn && !doc.checkOut) {
        doc.status = "In Progress";
      } else if (doc.checkIn && doc.checkOut && (!doc.status || doc.status === "Present" || doc.status === "In Progress")) {
        doc.status = "Completed";
      }
      return doc;
    });

    res.json(sanitized);
  } catch (error) {
    console.error("Get attendance error:", error.message);
    res.status(500).json({
      message: "Could not get attendance records.",
    });
  }
});

module.exports = router;
