const express = require("express");

const leaveRoutes = require("../routes/leaveRoutes");

const router = express.Router();

router.use("/", leaveRoutes);

module.exports = router;
