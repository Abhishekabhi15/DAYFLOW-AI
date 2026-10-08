const express = require("express");

const {
  applyLeave,
  getLeaves,
  updateLeave,
} = require("../controllers/leaveController");

const {
  authenticate,
  verifyAdmin,
} = require("../access/authentication");

const router = express.Router();

router.post("/", authenticate, applyLeave);

router.get("/", authenticate, getLeaves);

router.patch("/:id", authenticate, verifyAdmin, updateLeave);

module.exports = router;
