const Leave = require("../records/leave");

const applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, remarks } = req.body;

    const leave = await Leave.create({
      employee: req.user._id,
      leaveType,
      startDate,
      endDate,
      remarks,
      status: "Pending",
    });

    res.status(201).json(leave);
  } catch (error) {
    console.error("Leave error:", error.message);

    res.status(500).json({
      message: "Could not apply for leave",
    });
  }
};

const getLeaves = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "Employee") {
      filter.employee = req.user._id;
    }

    const leaves = await Leave.find(filter)
      .populate("employee", "employeeId name department designation")
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    console.error("Get leaves error:", error.message);

    res.status(500).json({
      message: "Could not get leave requests",
    });
  }
};

const updateLeave = async (req, res) => {
  try {
    const { status, adminComment } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid leave status",
      });
    }

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        message: "Leave request not found",
      });
    }

    leave.status = status;
    leave.adminComment = adminComment || "";
    leave.approvedBy = req.user._id;

    await leave.save();

    res.json(leave);
  } catch (error) {
    console.error("Update leave error:", error.message);

    res.status(500).json({
      message: "Could not update leave",
    });
  }
};

module.exports = {
  applyLeave,
  getLeaves,
  updateLeave,
};
