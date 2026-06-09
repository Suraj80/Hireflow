const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const {
  addCandidateNote,
  addCandidateInterview,
  applyToJobPublic,
  assignCandidate,
  bulkActionCandidates,
  checkDuplicateCandidate,
  createCandidate,
  deleteCandidate,
  deleteCandidateNote,
  getCandidateById,
  getCandidateStatusByToken,
  getCandidatesMeta,
  getCandidates,
  requestResumeUploadUrl,
  rescoreCandidate,
  updateCandidate,
  updateCandidateNote,
  updateCandidateStage,
} = require("../controllers/candidate.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");
const { getResumeUploadPolicy } = require("../services/workspace-settings.service");

const router = express.Router();
const uploadsDirectory = path.join(__dirname, "..", "..", "uploads", "resumes");

fs.mkdirSync(uploadsDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const basename = path
      .basename(file.originalname || "resume", extension)
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || "resume";

    callback(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${basename}${extension}`);
  },
});

const createResumeUploader = (policy) =>
  multer({
    storage,
    limits: {
      fileSize: policy.maxSizeBytes,
    },
    fileFilter: (_req, file, callback) => {
      if (!policy.allowedMimeTypes.includes(file.mimetype)) {
        callback(new Error(`Resume must be ${policy.allowedFormats.join(", ")}`));
        return;
      }

      callback(null, true);
    },
  });

const handleResumeUpload = async (req, res, next) => {
  try {
    const policy = await getResumeUploadPolicy();
    const uploadResume = createResumeUploader(policy);

    uploadResume.single("resume")(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: `Resume must be smaller than ${policy.maxSizeMb}MB` });
      }

      return res.status(400).json({ message: error.message || "Unable to upload resume" });
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

router.get("/", protect, getCandidates);
router.get("/meta", protect, getCandidatesMeta);
router.get("/duplicate-check", protect, checkDuplicateCandidate);
router.get("/status/:token", getCandidateStatusByToken);
router.post(
  "/public/apply/:jobId",
  handleResumeUpload,
  applyToJobPublic
);
router.post(
  "/upload",
  protect,
  requireRole("recruiter", "admin"),
  handleResumeUpload,
  requestResumeUploadUrl
);
router.post("/bulk-action", protect, requireRole("recruiter", "admin"), bulkActionCandidates);
router.get("/:id", protect, getCandidateById);
router.post("/", protect, requireRole("recruiter", "admin"), createCandidate);
router.patch("/:id", protect, requireRole("recruiter", "admin"), updateCandidate);
router.put("/:id", protect, requireRole("recruiter", "admin"), updateCandidate);
router.post("/:id/rescore", protect, requireRole("recruiter", "admin"), rescoreCandidate);
router.patch("/:id/stage", protect, requireRole("recruiter", "admin"), updateCandidateStage);
router.patch("/:id/assign", protect, requireRole("recruiter", "admin"), assignCandidate);
router.post("/:id/note", protect, requireRole("recruiter", "admin"), addCandidateNote);
router.post("/:id/interviews", protect, requireRole("recruiter", "admin"), addCandidateInterview);
router.patch("/:id/notes/:noteId", protect, requireRole("recruiter", "admin"), updateCandidateNote);
router.delete("/:id/notes/:noteId", protect, requireRole("recruiter", "admin"), deleteCandidateNote);
router.delete("/:id", protect, requireRole("recruiter", "admin"), deleteCandidate);

module.exports = router;
