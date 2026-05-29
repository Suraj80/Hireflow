const express = require("express");
const { createUser, listUsers, updateRole } = require("../controllers/user.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, requireRole("admin"), listUsers);
router.post("/", protect, requireRole("admin"), createUser);
router.patch("/:id/role", protect, requireRole("admin"), updateRole);

module.exports = router;
