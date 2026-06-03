const express = require("express");
const { getSettings, updateSettings } = require("../controllers/settings.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, requireRole("admin"), getSettings);
router.patch("/", protect, requireRole("admin"), updateSettings);

module.exports = router;
