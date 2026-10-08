const express = require("express");
const Attendance = require("../records/attendance");
const { authenticate, verifyAdmin } = require("../access/authentication");

const router = express.Router();

router.post("/check-in", authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({
      employee: req.user._id,
      date: today,
    });

    if (existing) {
      return res.status(400).json({
        message: "Already checked in today",
      });
    }

    const attendance = await Attendance.create({
      employee: req.user._id,
      date: today,
      checkIn: new Date(),
      status: "Present",
    });

    res.status(201).json(attendance);
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      message: error.message,
    });
  }
});

router.post("/check-out", authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: today,
    });

    if (!attendance) {
      return res.status(400).json({
        message: "You must check in before checking out",
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        message: `Already checked out today`,
      });
    }

    attendance.checkOut = new Date();
    await attendance.save();

    res.json(attendance);
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      message: error.message,
    });
  }
});

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
      .populate("employee", "employeeId name department designation")
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      message: "Could not get attendance",
    });
  }
});

module.exports = router;
