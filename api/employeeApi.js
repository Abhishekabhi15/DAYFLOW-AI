const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../records/user");
const Salary = require("../records/salary");
const {
  authenticate,
  verifyAdmin,
  verifyHR,
  verifyAdminOrHR,
} = require("../access/authentication");
const { sanitizeUser } = require("../actions/authenticationActions");

const router = express.Router();

/**
 * POST /api/employees
 * HR Only: Create new employee in "Pending Approval" state
 * If a Manager calls this endpoint: Returns 403 Forbidden
 */
router.post("/", authenticate, async (req, res, next) => {
  try {
    // Explicit security check: Manager MUST NOT create employee accounts
    if (req.user.role === "Admin") {
      return res.status(403).json({
        message: "Managers are not authorized to create employee accounts.",
      });
    }

    if (req.user.role !== "HR Officer") {
      return res.status(403).json({
        message: "Only HR Officers are authorized to create employee accounts.",
      });
    }

    const {
      employeeId,
      name,
      email,
      password,
      phone,
      address,
      department,
      designation,
      joiningDate,
      initialSalary,
    } = req.body;

    if (!employeeId || !name || !email || !password) {
      return res.status(400).json({
        message: "Employee ID, Full Name, Work Email, and Password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedEmpId = employeeId.trim().toUpperCase();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { employeeId: normalizedEmpId }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "An employee with this Employee ID or Email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newEmployee = await User.create({
      employeeId: normalizedEmpId,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "Employee",
      phone: phone ? phone.trim() : "",
      address: address ? address.trim() : "",
      department: department ? department.trim() : "Engineering",
      designation: designation ? designation.trim() : "Associate Engineer",
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      status: "Pending",
      approvalStatus: "Pending",
      createdBy: req.user._id,
    });

    // If initial salary was provided, create initial Pending salary record
    if (initialSalary && Number(initialSalary) > 0) {
      const basicSalary = Number(initialSalary);
      const grossSalary = basicSalary;
      const netSalary = basicSalary;
      const currentMonth = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

      try {
        await Salary.create({
          employee: newEmployee._id,
          employeeId: newEmployee.employeeId,
          salaryMonth: currentMonth,
          basicSalary,
          allowances: 0,
          deductions: 0,
          bonus: 0,
          grossSalary,
          netSalary,
          paymentStatus: "Pending",
          createdBy: req.user._id,
        });
      } catch (salaryErr) {
        console.warn("Failed to create initial salary record:", salaryErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: "Employee created successfully with 'Pending Approval' status. Awaiting Manager review.",
      employee: sanitizeUser(newEmployee),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/employees/pending
 * Manager Only: Fetch employees awaiting approval
 */
router.get("/pending", authenticate, verifyAdmin, async (req, res, next) => {
  try {
    const pendingEmployees = await User.find({
      approvalStatus: "Pending",
    })
      .select("-password")
      .populate("createdBy", "name employeeId email role")
      .sort({ createdAt: -1 });

    res.json(pendingEmployees);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/employees
 * Manager or HR: Get employee directory with filters
 */
router.get("/", authenticate, verifyAdminOrHR, async (req, res, next) => {
  try {
    const { department, status, approvalStatus, designation, search } = req.query;
    const filter = {};

    if (department && department !== "All") {
      filter.department = department;
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    if (approvalStatus && approvalStatus !== "All") {
      filter.approvalStatus = approvalStatus;
    }

    if (designation && designation !== "All") {
      filter.designation = designation;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { employeeId: regex },
        { email: regex },
        { department: regex },
        { designation: regex },
      ];
    }

    const employees = await User.find(filter)
      .select("-password")
      .populate("createdBy", "name employeeId email role")
      .populate("approvedBy", "name employeeId email role")
      .populate("rejectedBy", "name employeeId email role")
      .sort({ name: 1 });

    res.json(employees);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/employees/:id
 * Manager or HR: Get employee details
 */
router.get("/:id", authenticate, verifyAdminOrHR, async (req, res, next) => {
  try {
    const employee = await User.findById(req.params.id)
      .select("-password")
      .populate("createdBy", "name employeeId email role")
      .populate("approvedBy", "name employeeId email role")
      .populate("rejectedBy", "name employeeId email role");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    res.json(employee);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/employees/:id/approve
 * Manager Only: Approve employee request
 */
router.patch("/:id/approve", authenticate, verifyAdmin, async (req, res, next) => {
  try {
    const employee = await User.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: "Employee request not found." });
    }

    if (employee.approvalStatus === "Approved") {
      return res.status(400).json({ message: "Employee is already approved." });
    }

    employee.approvalStatus = "Approved";
    employee.status = "Active";
    employee.approvedBy = req.user._id;
    employee.approvedAt = new Date();
    employee.rejectionReason = "";
    employee.rejectedBy = null;
    employee.rejectedAt = null;

    await employee.save();

    const populated = await User.findById(employee._id)
      .select("-password")
      .populate("approvedBy", "name employeeId email role")
      .populate("createdBy", "name employeeId email role");

    res.json({
      success: true,
      message: `Employee ${employee.name} (${employee.employeeId}) has been approved and activated.`,
      employee: populated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/employees/:id/reject
 * Manager Only: Reject employee request
 */
router.patch("/:id/reject", authenticate, verifyAdmin, async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        message: "Rejection reason is required when rejecting an employee account request.",
      });
    }

    const employee = await User.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: "Employee request not found." });
    }

    employee.approvalStatus = "Rejected";
    employee.status = "Rejected";
    employee.rejectionReason = rejectionReason.trim();
    employee.rejectedBy = req.user._id;
    employee.rejectedAt = new Date();
    employee.approvedBy = null;
    employee.approvedAt = null;

    await employee.save();

    const populated = await User.findById(employee._id)
      .select("-password")
      .populate("rejectedBy", "name employeeId email role")
      .populate("createdBy", "name employeeId email role");

    res.json({
      success: true,
      message: `Employee request for ${employee.name} has been rejected.`,
      employee: populated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/employees/:id
 * HR Only: Update employee details
 */
router.patch("/:id", authenticate, verifyHR, async (req, res, next) => {
  try {
    const { name, phone, address, department, designation, status } = req.body;
    const employee = await User.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    if (name !== undefined) employee.name = name.trim();
    if (phone !== undefined) employee.phone = phone.trim();
    if (address !== undefined) employee.address = address.trim();
    if (department !== undefined) employee.department = department.trim();
    if (designation !== undefined) employee.designation = designation.trim();
    if (status !== undefined && ["Active", "Inactive"].includes(status)) {
      employee.status = status;
    }

    await employee.save();

    res.json({
      success: true,
      message: "Employee updated successfully.",
      employee: sanitizeUser(employee),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
