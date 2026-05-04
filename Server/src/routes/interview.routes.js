const express = require("express");
const {
  addInterviewFeedback,
  createInterview,
  deleteInterview,
  getInterviewById,
  getInterviews,
  getInterviewsCalendar,
  updateInterview,
  updateInterviewStatus,
  rescheduleInterview,
} = require("../controllers/interview.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, getInterviews);
router.get("/calendar", protect, getInterviewsCalendar);
router.get("/:id", protect, getInterviewById);
router.post("/", protect, requireRole("recruiter", "admin"), createInterview);
router.patch("/:id", protect, requireRole("recruiter", "admin"), updateInterview);
router.patch("/:id/reschedule", protect, requireRole("recruiter", "admin"), rescheduleInterview);
router.patch("/:id/status", protect, requireRole("recruiter", "admin"), updateInterviewStatus);
router.post("/:id/feedback", protect, addInterviewFeedback);
router.delete("/:id", protect, requireRole("recruiter", "admin"), deleteInterview);

module.exports = router;
