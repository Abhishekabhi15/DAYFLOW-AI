const Attendance = require("../records/attendance");

const checkIn = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({
      employee: req.user.userId,
      date: today,
    });

    if (existing) {
      return res.status(400).json({
        message: "Already checked in today",
      });
    }

    const attendance = await Attendance.create({
      employee: req.user.userId,
      date: today,
      checkIn: new Date(),
      status: "Present",
    });

    res.status(201).json(attendance);
  } catch (error) {
    console.log("Attendance error:", error.message);

    res.status(500).json({
      message: error.message,
    });
  }
};

const getAttendance = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "Employee") {
      filter.employee = req.user.userId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const attendance = await Attendance.find(filter)
      .populate("employee", "employeeId name department designation")
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    console.log("Get attendance error:", error.message);

    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  checkIn,
  getAttendance,
};
