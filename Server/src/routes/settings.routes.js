const express = require("express");
const {
  getEmailIntegrationSettings,
  getSettings,
  sendTestEmail,
  updateSettings,
} = require("../controllers/settings.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, requireRole("admin"), getSettings);
router.patch("/", protect, requireRole("admin"), updateSettings);
router.get("/integrations/email", protect, requireRole("admin"), getEmailIntegrationSettings);
router.post("/integrations/email/test", protect, requireRole("admin"), sendTestEmail);

module.exports = router;
