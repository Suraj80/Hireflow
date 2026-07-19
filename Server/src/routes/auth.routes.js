const express = require("express");
const { register, login, adminLogin, recruiterLogin, demoLogin, refresh, logout, me, updateMe } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/admin-login", adminLogin);
router.post("/recruiter-login", recruiterLogin);
router.post("/demo-login", demoLogin);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", protect, me);
router.patch("/me", protect, updateMe);

module.exports = router;
