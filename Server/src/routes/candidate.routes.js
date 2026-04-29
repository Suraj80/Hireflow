const express = require("express");
const {
  addCandidateNote,
  addCandidateInterview,
  assignCandidate,
  bulkActionCandidates,
  checkDuplicateCandidate,
  createCandidate,
  deleteCandidate,
  deleteCandidateNote,
  getCandidateById,
  getCandidatesMeta,
  getCandidates,
  requestResumeUploadUrl,
  updateCandidate,
  updateCandidateNote,
  updateCandidateStage,
} = require("../controllers/candidate.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, getCandidates);
router.get("/meta", protect, getCandidatesMeta);
router.get("/duplicate-check", protect, checkDuplicateCandidate);
router.post("/upload-url", protect, requireRole("recruiter", "admin"), requestResumeUploadUrl);
router.post("/bulk-action", protect, requireRole("recruiter", "admin"), bulkActionCandidates);
router.get("/:id", protect, getCandidateById);
router.post("/", protect, requireRole("recruiter", "admin"), createCandidate);
router.patch("/:id", protect, requireRole("recruiter", "admin"), updateCandidate);
router.put("/:id", protect, requireRole("recruiter", "admin"), updateCandidate);
router.patch("/:id/stage", protect, requireRole("recruiter", "admin"), updateCandidateStage);
router.patch("/:id/assign", protect, requireRole("recruiter", "admin"), assignCandidate);
router.post("/:id/note", protect, requireRole("recruiter", "admin"), addCandidateNote);
router.post("/:id/interviews", protect, requireRole("recruiter", "admin"), addCandidateInterview);
router.patch("/:id/notes/:noteId", protect, requireRole("recruiter", "admin"), updateCandidateNote);
router.delete("/:id/notes/:noteId", protect, requireRole("recruiter", "admin"), deleteCandidateNote);
router.delete("/:id", protect, requireRole("recruiter", "admin"), deleteCandidate);

module.exports = router;
