const express = require("express");
const {
  createJob,
  getJobs,
  getJobById,
  getJobMeta,
  updateJob,
  deleteJob,
} = require("../controllers/job.controller");
const { optionalProtect, protect, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, getJobs);
router.get("/meta", protect, requireRole("recruiter", "admin"), getJobMeta);
router.get("/:id", optionalProtect, getJobById);
router.post("/", protect, requireRole("recruiter", "admin"), createJob);
router.patch("/:id", protect, requireRole("recruiter", "admin"), updateJob);
router.put("/:id", protect, requireRole("recruiter", "admin"), updateJob);
router.delete("/:id", protect, requireRole("recruiter", "admin"), deleteJob);

module.exports = router;
