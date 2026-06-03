const express = require("express");
const { createUser, listUsers, listUserOptions, updateRole } = require("../controllers/user.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, requireRole("admin"), listUsers);
router.get("/options", protect, requireRole("admin", "recruiter"), listUserOptions);
router.post("/", protect, requireRole("admin"), createUser);
router.patch("/:id/role", protect, requireRole("admin"), updateRole);

module.exports = router;
