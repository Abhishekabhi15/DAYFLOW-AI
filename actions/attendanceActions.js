const Attendance = require("../records/attendance");

const getDayBounds = (baseDate = new Date()) => {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const checkIn = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { start, end } = getDayBounds();

    const activeSession = await Attendance.findOne({
      employee: userId,
      checkIn: { $exists: true, $ne: null },
      checkOut: null,
    });

    if (activeSession) {
      return res.status(400).json({
        message: "You are already checked in.",
      });
    }

    const existingToday = await Attendance.findOne({
      employee: userId,
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
      employee: userId,
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
    console.error("Attendance error:", error.message);
    res.status(500).json({
      message: error.message,
    });
  }
};

const checkOut = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { start, end } = getDayBounds();

    let attendance = await Attendance.findOne({
      employee: userId,
      checkIn: { $exists: true, $ne: null },
      checkOut: null,
    }).sort({ checkIn: -1 });

    if (!attendance) {
      const alreadyCheckedOut = await Attendance.findOne({
        employee: userId,
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
    console.error("Attendance checkOut error:", error.message);
    res.status(500).json({
      message: error.message,
    });
  }
};

const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { start, end } = getDayBounds();

    let record = await Attendance.findOne({
      employee: userId,
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
    console.error("Get today error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

const getAttendance = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const filter = {};

    if (req.user.role === "Employee") {
      filter.employee = userId;
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
      message: error.message,
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendance,
};
