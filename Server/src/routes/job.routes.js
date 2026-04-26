const express = require("express");
const {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
} = require("../controllers/job.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", getJobs);
router.get("/:id", getJobById);
router.post("/", protect, requireRole("recruiter", "admin"), createJob);
router.put("/:id", protect, requireRole("recruiter", "admin"), updateJob);
router.delete("/:id", protect, requireRole("recruiter", "admin"), deleteJob);

module.exports = router;
