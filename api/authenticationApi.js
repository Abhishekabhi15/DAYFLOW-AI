const express = require("express");

const { register, login, me, updateProfile } = require("../actions/authenticationActions");
const { authenticate } = require("../access/authentication");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, me);
router.put("/me", authenticate, updateProfile);
router.put("/profile", authenticate, updateProfile);

module.exports = router;
