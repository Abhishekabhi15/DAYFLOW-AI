const express = require("express");
const { getDashboard } = require("../controllers/dashboardController");
const { authenticate, verifyAdminOrHR } = require("../access/authentication");

const router = express.Router();

router.get("/admin", authenticate, verifyAdminOrHR, getDashboard);

module.exports = router;
