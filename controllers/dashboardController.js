const User = require("../records/user");
const Attendance = require("../records/attendance");
const Leave = require("../records/leave");
const Salary = require("../records/salary");

const getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const employees = await User.find()
      .select("-password")
      .populate("createdBy", "name employeeId email")
      .populate("approvedBy", "name employeeId email")
      .sort({ name: 1 });

    const attendance = await Attendance.find()
      .populate("employee", "employeeId name role department designation")
      .sort({ date: -1 })
      .limit(30);

    const pendingLeaves = await Leave.find({
      status: "Pending",
    })
      .populate("employee", "employeeId name role department designation")
      .sort({ createdAt: -1 });

    const pendingEmployees = await User.find({
      approvalStatus: "Pending",
    })
      .select("-password")
      .populate("createdBy", "name employeeId email")
      .sort({ createdAt: -1 });

    const recentSalaries = await Salary.find()
      .populate("employee", "employeeId name department designation")
      .sort({ createdAt: -1 })
      .limit(10);

    const totalEmployees = await User.countDocuments({ role: "Employee" });
    const pendingApprovalsCount = await User.countDocuments({ approvalStatus: "Pending" });

    const presentCount = await Attendance.countDocuments({
      date: { $gte: today },
      status: "Present",
    });

    const pendingLeaveCount = await Leave.countDocuments({
      status: "Pending",
    });

    // Compute total payroll from latest records
    const allSalaries = await Salary.find();
    let totalPayroll = 0;
    let totalPaid = 0;
    allSalaries.forEach((s) => {
      totalPayroll += s.netSalary || 0;
      if (s.paymentStatus === "Credited") {
        totalPaid += s.netSalary || 0;
      }
    });

    res.json({
      employees,
      attendance,
      pendingLeaves,
      pendingEmployees,
      recentSalaries,

      stats: {
        totalEmployees,
        present: presentCount,
        pendingLeaves: pendingLeaveCount,
        pendingApprovals: pendingApprovalsCount,
        totalPayroll,
        totalPaid,
      },
    });
  } catch (error) {
    console.error("Dashboard controller error:", error);

    res.status(500).json({
      message: "Could not load dashboard data.",
    });
  }
};

module.exports = { getDashboard };
