const express = require("express");
const { getAuditLogs } = require("../controllers/audit.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, getAuditLogs);

module.exports = router;
