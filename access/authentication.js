const jwt = require("jsonwebtoken");
const User = require("../records/user");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. No authentication token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dayflow_secret");

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User session not found or expired.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access forbidden. Insufficient role permissions.",
      });
    }
    next();
  };
};

const verifyAdmin = (req, res, next) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({
      message: "Access restricted to Managers only.",
    });
  }
  next();
};

const verifyHR = (req, res, next) => {
  if (req.user.role !== "HR Officer") {
    return res.status(403).json({
      message: "Access restricted to HR Officers only.",
    });
  }
  next();
};

const verifyAdminOrHR = (req, res, next) => {
  if (req.user.role !== "Admin" && req.user.role !== "HR Officer") {
    return res.status(403).json({
      message: "Access restricted to Management and HR Officers.",
    });
  }
  next();
};

const verifyEmployee = (req, res, next) => {
  if (req.user.role !== "Employee") {
    return res.status(403).json({
      message: "Access restricted to Employees.",
    });
  }
  next();
};

module.exports = {
  authenticate,
  requireRole,
  verifyAdmin,
  verifyHR,
  verifyAdminOrHR,
  verifyEmployee,
};
