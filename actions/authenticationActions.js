const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../records/user");

const sanitizeUser = (user) => {
  return {
    _id: user._id,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || "",
    address: user.address || "",
    department: user.department || "General Operations",
    designation: user.designation || "Employee",
    joiningDate: user.joiningDate,
    profilePicture: user.profilePicture || "",
    status: user.status || "Active",
    approvalStatus: user.approvalStatus || "Approved",
    approvedBy: user.approvedBy,
    approvedAt: user.approvedAt,
    rejectionReason: user.rejectionReason || "",
    createdBy: user.createdBy,
  };
};

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET || "dayflow_secret",
    {
      expiresIn: "7d",
    },
  );
};

const register = async (req, res, next) => {
  try {
    // If an Admin/Manager attempts account creation:
    if (req.user && req.user.role === "Admin") {
      return res.status(403).json({
        message: "Managers are not authorized to create employee accounts.",
      });
    }

    const { employeeId, name, email, password, role, phone, department, designation, joiningDate } = req.body;

    if (!employeeId || !name || !email || !password) {
      return res.status(400).json({
        message: "Please fill all required fields (Employee ID, Name, Email, Password)",
      });
    }

    const targetRole = role || "Employee";

    if (!["Admin", "HR Officer", "Employee"].includes(targetRole)) {
      return res.status(400).json({
        message: "Invalid role specified",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { employeeId: employeeId.toUpperCase() }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User with this Email or Employee ID already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // HR creation or general registration creates employee in Pending state
    const isEmployeeRole = targetRole === "Employee";
    const status = isEmployeeRole ? "Pending" : "Active";
    const approvalStatus = isEmployeeRole ? "Pending" : "Approved";

    const user = await User.create({
      employeeId: employeeId.trim().toUpperCase(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: targetRole,
      phone: phone || "",
      department: department || "General Operations",
      designation: designation || "Employee",
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      status,
      approvalStatus,
      createdBy: req.user ? req.user._id : null,
    });

    res.status(201).json({
      message: isEmployeeRole
        ? "Employee account created and submitted for Manager approval."
        : "Account created successfully.",
      user: sanitizeUser(user),
      token: createToken(user),
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Role-based login constraints:
    // If user is Employee, check approval status:
    if (user.role === "Employee") {
      if (user.approvalStatus === "Pending") {
        return res.status(403).json({
          message: "Your employee account is awaiting manager approval.",
        });
      }

      if (user.approvalStatus === "Rejected") {
        return res.status(403).json({
          message: "Your employee account request was rejected. Please contact HR.",
        });
      }

      if (user.status === "Inactive") {
        return res.status(403).json({
          message: "Your employee account is currently inactive. Please contact HR or Manager.",
        });
      }
    }

    res.json({
      user: sanitizeUser(user),
      token: createToken(user),
    });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res) => {
  res.json({
    user: sanitizeUser(req.user),
  });
};

const updateProfile = async (req, res, next) => {
  try {
    const { phone, address, name } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (name !== undefined) user.name = name;

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const seedAdmin = async () => {
  try {
    // 1. Seed Manager
    const adminPassword = await bcrypt.hash("admin123", 10);
    let admin = await User.findOne({ email: "admin@dayflow.com" });
    if (!admin) {
      admin = await User.create({
        employeeId: "MGR001",
        name: "Manager",
        email: "admin@dayflow.com",
        password: adminPassword,
        role: "Admin",
        department: "Executive Management",
        designation: "General Manager",
        phone: "+1 (555) 019-2834",
        address: "Dayflow HQ, 100 Innovation Way, Enterprise City",
        status: "Active",
        approvalStatus: "Approved",
      });
      console.log("Default Manager seeded: admin@dayflow.com / admin123");
    } else {
      admin.role = "Admin";
      admin.status = "Active";
      admin.approvalStatus = "Approved";
      await admin.save();
    }

    // 2. Seed HR Officer
    const hrPassword = await bcrypt.hash("hr12345", 10);
    let hr = await User.findOne({ email: "hr@dayflow.com" });
    if (!hr) {
      hr = await User.create({
        employeeId: "HR001",
        name: "HR Officer",
        email: "hr@dayflow.com",
        password: hrPassword,
        role: "HR Officer",
        department: "People & Culture",
        designation: "Senior HR Officer",
        phone: "+1 (555) 019-5678",
        address: "Dayflow HQ, 100 Innovation Way, Enterprise City",
        status: "Active",
        approvalStatus: "Approved",
      });
      console.log("Default HR seeded: hr@dayflow.com / hr12345");
    } else {
      hr.role = "HR Officer";
      hr.status = "Active";
      hr.approvalStatus = "Approved";
      await hr.save();
    }

    // 3. Seed Default Active Employee
    const empPassword = await bcrypt.hash("emp12345", 10);
    let employee = await User.findOne({ email: "employee@dayflow.com" });
    if (!employee) {
      employee = await User.create({
        employeeId: "EMP001",
        name: "Employee User",
        email: "employee@dayflow.com",
        password: empPassword,
        role: "Employee",
        department: "Engineering",
        designation: "Full Stack Engineer",
        phone: "+1 (555) 019-9012",
        address: "742 Evergreen Terrace, Springfield",
        status: "Active",
        approvalStatus: "Approved",
      });
      console.log("Default Employee seeded: employee@dayflow.com / emp12345");
    } else {
      if (!employee.approvalStatus) {
        employee.approvalStatus = "Approved";
        await employee.save();
      }
    }

    // 4. Ensure any existing users in DB without approvalStatus are Approved
    await User.updateMany(
      { approvalStatus: { $exists: false } },
      { $set: { approvalStatus: "Approved", status: "Active" } }
    );
  } catch (err) {
    console.error("Error during initial data seeding:", err.message);
  }
};

module.exports = {
  register,
  login,
  me,
  updateProfile,
  seedAdmin,
  sanitizeUser,
};
