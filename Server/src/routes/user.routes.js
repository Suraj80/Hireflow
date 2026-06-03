const express = require("express");
const {
  createUser,
  deleteUser,
  listUsers,
  listUserOptions,
  updatePassword,
  updateRole,
  updateStatus,
} = require("../controllers/user.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, requireRole("admin"), listUsers);
router.get("/options", protect, requireRole("admin", "recruiter"), listUserOptions);
router.post("/", protect, requireRole("admin"), createUser);
router.patch("/:id/role", protect, requireRole("admin"), updateRole);
router.patch("/:id/status", protect, requireRole("admin"), updateStatus);
router.patch("/:id/password", protect, requireRole("admin"), updatePassword);
router.delete("/:id", protect, requireRole("admin"), deleteUser);

module.exports = router;
