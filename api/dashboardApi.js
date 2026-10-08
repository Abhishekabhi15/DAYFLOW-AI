const express = require("express");

const { getDashboard } = require("../actions/dashboardActions");
const { authenticate, verifyAdmin } = require("../access/authentication");

const router = express.Router();

router.get("/", authenticate, verifyAdmin, getDashboard);

module.exports = router;
