const express = require("express");
const { updateRole } = require("../controllers/user.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.patch("/:id/role", protect, requireRole("admin"), updateRole);

module.exports = router;
