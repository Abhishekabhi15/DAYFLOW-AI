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
      .populate("employee", "employeeId name department designation role email")
      .populate("approvedBy", "name employeeId email role")
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

    const leave = await Leave.findById(req.params.id).populate("employee");

    if (!leave) {
      return res.status(404).json({
        message: "Leave request not found",
      });
    }

    // Step 4 & 17 Rule: Users cannot approve or reject their own leave requests
    const requesterId = (leave.employee?._id || leave.employee)?.toString();
    const currentUserId = req.user._id.toString();

    if (requesterId === currentUserId) {
      return res.status(403).json({
        message: "Users cannot approve or reject their own leave requests.",
      });
    }

    const requesterRole = leave.employee?.role || "Employee";

    // Step 4 & 5 Rule: HR Officers CANNOT approve HR Officer or Manager leave requests
    if (req.user.role === "HR Officer") {
      if (requesterRole === "HR Officer") {
        return res.status(403).json({
          message: "HR Officers cannot approve HR Officer leave requests.",
        });
      }
      if (requesterRole === "Admin") {
        return res.status(403).json({
          message: "HR Officers cannot approve Manager leave requests.",
        });
      }
      if (requesterRole !== "Employee") {
        return res.status(403).json({
          message: "HR Officers can only approve or reject Employee leave requests.",
        });
      }
    } else if (req.user.role === "Admin") {
      // Manager can approve/reject both Employee and HR Officer leave requests
      // (and self-approval is already rejected above)
    } else {
      return res.status(403).json({
        message: "Access forbidden. Insufficient role permissions.",
      });
    }

    leave.status = status;
    leave.adminComment = adminComment || "";
    leave.approvedBy = req.user._id;
    leave.reviewedAt = new Date();

    await leave.save();

    const populatedLeave = await Leave.findById(leave._id)
      .populate("employee", "employeeId name department designation role email")
      .populate("approvedBy", "name employeeId email role");

    res.json(populatedLeave);
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
