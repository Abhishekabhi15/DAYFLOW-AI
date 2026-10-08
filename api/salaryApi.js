const express = require("express");
const Salary = require("../records/salary");
const User = require("../records/user");
const {
  authenticate,
  verifyHR,
  verifyAdminOrHR,
} = require("../access/authentication");

const router = express.Router();

/**
 * GET /api/salaries/my
 * Authenticated Employee: Retrieve own current salary and salary history
 */
router.get("/my", authenticate, async (req, res, next) => {
  try {
    const history = await Salary.find({ employee: req.user._id })
      .populate("employee", "employeeId name department designation email")
      .sort({ createdAt: -1 });

    const currentSalary = history.length > 0 ? history[0] : null;

    res.json({
      currentSalary,
      history,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/salaries
 * Manager or HR: Get payroll overview and filtered salary records
 */
router.get("/", authenticate, verifyAdminOrHR, async (req, res, next) => {
  try {
    const { month, department, paymentStatus, search } = req.query;

    let salaryFilter = {};

    if (month && month !== "All") {
      salaryFilter.salaryMonth = month;
    }

    if (paymentStatus && paymentStatus !== "All") {
      salaryFilter.paymentStatus = paymentStatus;
    }

    let records = await Salary.find(salaryFilter)
      .populate("employee", "employeeId name department designation email status")
      .populate("createdBy", "name employeeId email")
      .sort({ createdAt: -1 });

    // Filter by department or search on populated employee
    if (department && department !== "All") {
      records = records.filter(
        (rec) => rec.employee && rec.employee.department === department
      );
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      records = records.filter((rec) => {
        if (!rec.employee) return false;
        return (
          rec.employee.name.toLowerCase().includes(q) ||
          rec.employee.employeeId.toLowerCase().includes(q) ||
          rec.employee.email.toLowerCase().includes(q) ||
          (rec.transactionReference && rec.transactionReference.toLowerCase().includes(q))
        );
      });
    }

    // Summary stats calculation
    let totalPayroll = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let employeesPaidCount = 0;

    records.forEach((rec) => {
      totalPayroll += rec.netSalary || 0;
      if (rec.paymentStatus === "Credited") {
        totalPaid += rec.netSalary || 0;
        employeesPaidCount += 1;
      } else {
        totalPending += rec.netSalary || 0;
      }
    });

    res.json({
      records,
      stats: {
        totalPayroll,
        totalPaid,
        totalPending,
        employeesPaidCount,
        totalRecords: records.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/salaries/:employeeId
 * Manager or HR: Get salary history for a specific employee
 */
router.get("/:employeeId", authenticate, verifyAdminOrHR, async (req, res, next) => {
  try {
    const { employeeId } = req.params;

    // Support both User _id and custom employeeId string
    const employee = await User.findOne({
      $or: [{ _id: employeeId.match(/^[0-9a-fA-F]{24}$/) ? employeeId : null }, { employeeId }],
    }).select("-password");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    const history = await Salary.find({ employee: employee._id })
      .populate("employee", "employeeId name department designation email")
      .populate("createdBy", "name employeeId email")
      .sort({ createdAt: -1 });

    res.json({
      employee,
      currentSalary: history.length > 0 ? history[0] : null,
      history,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/salaries
 * HR Only: Create monthly salary record
 */
router.post("/", authenticate, verifyHR, async (req, res, next) => {
  try {
    const {
      employeeId,
      salaryMonth,
      basicSalary,
      allowances = 0,
      deductions = 0,
      bonus = 0,
      paymentStatus = "Pending",
      paymentDate,
      transactionReference,
    } = req.body;

    if (!employeeId || !salaryMonth || basicSalary === undefined) {
      return res.status(400).json({
        message: "Employee, Salary Month, and Basic Salary are required.",
      });
    }

    const bSalary = Number(basicSalary);
    const allow = Number(allowances) || 0;
    const ded = Number(deductions) || 0;
    const bon = Number(bonus) || 0;

    if (bSalary < 0 || allow < 0 || ded < 0 || bon < 0) {
      return res.status(400).json({
        message: "Salary amounts cannot be negative.",
      });
    }

    const grossSalary = bSalary + allow + bon;
    const netSalary = grossSalary - ded;

    if (netSalary < 0) {
      return res.status(400).json({
        message: "Deductions cannot exceed Gross Salary (Net Salary cannot be negative).",
      });
    }

    // Resolve employee
    const employee = await User.findOne({
      $or: [
        { _id: employeeId.match(/^[0-9a-fA-F]{24}$/) ? employeeId : null },
        { employeeId: employeeId.trim().toUpperCase() },
      ],
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    // Check duplicate record
    const existing = await Salary.findOne({
      employee: employee._id,
      salaryMonth: salaryMonth.trim(),
    });

    if (existing) {
      return res.status(400).json({
        message: `A salary record for ${employee.name} for ${salaryMonth} already exists.`,
      });
    }

    const newSalary = await Salary.create({
      employee: employee._id,
      employeeId: employee.employeeId,
      salaryMonth: salaryMonth.trim(),
      basicSalary: bSalary,
      allowances: allow,
      deductions: ded,
      bonus: bon,
      grossSalary,
      netSalary,
      paymentStatus: ["Pending", "Processed", "Credited"].includes(paymentStatus)
        ? paymentStatus
        : "Pending",
      paymentDate: paymentDate ? new Date(paymentDate) : null,
      transactionReference: transactionReference ? transactionReference.trim() : "",
      createdBy: req.user._id,
    });

    const populated = await Salary.findById(newSalary._id)
      .populate("employee", "employeeId name department designation email")
      .populate("createdBy", "name employeeId email");

    res.status(201).json({
      success: true,
      message: `Salary record created for ${employee.name} (${salaryMonth}).`,
      salary: populated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/salaries/:id
 * HR Only: Update existing salary record
 */
router.patch("/:id", authenticate, verifyHR, async (req, res, next) => {
  try {
    const salary = await Salary.findById(req.params.id);

    if (!salary) {
      return res.status(404).json({ message: "Salary record not found." });
    }

    const {
      basicSalary,
      allowances,
      deductions,
      bonus,
      paymentStatus,
      paymentDate,
      transactionReference,
    } = req.body;

    if (basicSalary !== undefined) salary.basicSalary = Math.max(0, Number(basicSalary));
    if (allowances !== undefined) salary.allowances = Math.max(0, Number(allowances));
    if (deductions !== undefined) salary.deductions = Math.max(0, Number(deductions));
    if (bonus !== undefined) salary.bonus = Math.max(0, Number(bonus));

    salary.grossSalary = salary.basicSalary + salary.allowances + salary.bonus;
    salary.netSalary = Math.max(0, salary.grossSalary - salary.deductions);

    if (paymentStatus && ["Pending", "Processed", "Credited"].includes(paymentStatus)) {
      salary.paymentStatus = paymentStatus;
      if (paymentStatus === "Credited" && !salary.paymentDate) {
        salary.paymentDate = new Date();
      }
    }

    if (paymentDate !== undefined) {
      salary.paymentDate = paymentDate ? new Date(paymentDate) : null;
    }

    if (transactionReference !== undefined) {
      salary.transactionReference = transactionReference.trim();
    }

    await salary.save();

    const populated = await Salary.findById(salary._id)
      .populate("employee", "employeeId name department designation email")
      .populate("createdBy", "name employeeId email");

    res.json({
      success: true,
      message: "Salary record updated successfully.",
      salary: populated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/salaries/:id/credit
 * HR Only: Mark salary as Credited
 */
router.patch("/:id/credit", authenticate, verifyHR, async (req, res, next) => {
  try {
    const { transactionReference, paymentDate } = req.body;
    const salary = await Salary.findById(req.params.id);

    if (!salary) {
      return res.status(404).json({ message: "Salary record not found." });
    }

    salary.paymentStatus = "Credited";
    salary.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
    if (transactionReference) {
      salary.transactionReference = transactionReference.trim();
    } else if (!salary.transactionReference) {
      salary.transactionReference = `PAY-${Date.now().toString(36).toUpperCase()}`;
    }

    await salary.save();

    const populated = await Salary.findById(salary._id)
      .populate("employee", "employeeId name department designation email")
      .populate("createdBy", "name employeeId email");

    res.json({
      success: true,
      message: "Salary marked as Credited successfully.",
      salary: populated,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
