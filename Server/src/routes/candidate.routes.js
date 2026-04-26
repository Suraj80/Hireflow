const express = require("express");
const {
  createCandidate,
  getCandidates,
  updateCandidate,
  deleteCandidate,
} = require("../controllers/candidate.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, getCandidates);
router.post("/", protect, requireRole("recruiter", "admin"), createCandidate);
router.put("/:id", protect, requireRole("recruiter", "admin"), updateCandidate);
router.delete("/:id", protect, requireRole("recruiter", "admin"), deleteCandidate);

module.exports = router;
