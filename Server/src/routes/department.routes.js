const express = require("express");
const {
  createDepartment,
  getDepartments,
  updateDepartment,
} = require("../controllers/department.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, getDepartments);
router.post("/", protect, requireRole("admin"), createDepartment);
router.patch("/:id", protect, requireRole("admin"), updateDepartment);

module.exports = router;
