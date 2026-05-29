const express = require("express");
const {
  getAnalyticsOverview,
  getInterviewAnalytics,
  getPipelineAnalytics,
  getSourceAnalytics,
  getTimeToHireAnalytics,
} = require("../controllers/analytics.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect, requireRole("admin", "recruiter"));

router.get("/overview", getAnalyticsOverview);
router.get("/pipeline", getPipelineAnalytics);
router.get("/sources", getSourceAnalytics);
router.get("/time-to-hire", getTimeToHireAnalytics);
router.get("/interviews", getInterviewAnalytics);

module.exports = router;
