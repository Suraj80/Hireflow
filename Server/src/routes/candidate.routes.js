const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = rateLimit;
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
  rescoreCandidatesForJob,
  updateCandidate,
  updateCandidateNote,
  updateCandidateStage,
} = require("../controllers/candidate.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");
const { getResumeUploadPolicy } = require("../services/workspace-settings.service");

const router = express.Router();
const uploadsDirectory = path.join(__dirname, "..", "..", "uploads", "resumes");

const aiScoringLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.id || req.user?.email;
    if (userId) {
      return `user:${userId}`;
    }

    return `ip:${ipKeyGenerator(req.ip)}`;
  },
  message: {
    message: "AI scoring is rate-limited. Please wait a few minutes before trying again.",
  },
});

const bulkAiScoringLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.id || req.user?.email;
    if (userId) {
      return `user:${userId}`;
    }

    return `ip:${ipKeyGenerator(req.ip)}`;
  },
  message: {
    message: "Bulk AI scoring is rate-limited. Please wait a few minutes before trying again.",
  },
});

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

    uploadResume.fields([
      { name: "resume", maxCount: 1 },
      { name: "coverLetter", maxCount: 1 },
      { name: "coverLetterFile", maxCount: 1 },
    ])(req, res, (error) => {
      if (!error) {
        // Keep legacy single-file access for resume-only handlers.
        req.file =
          req.files?.resume?.[0] ||
          req.files?.coverLetterFile?.[0] ||
          req.files?.coverLetter?.[0] ||
          req.file;
        return next();
      }

      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: `File must be smaller than ${policy.maxSizeMb}MB` });
      }

      return res.status(400).json({ message: error.message || "Unable to upload file" });
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
  aiScoringLimiter,
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
router.post(
  "/jobs/:jobId/rescore",
  protect,
  requireRole("recruiter", "admin"),
  bulkAiScoringLimiter,
  rescoreCandidatesForJob
);
router.get("/:id", protect, getCandidateById);
router.post("/", protect, requireRole("recruiter", "admin"), createCandidate);
router.patch("/:id", protect, requireRole("recruiter", "admin"), updateCandidate);
router.put("/:id", protect, requireRole("recruiter", "admin"), updateCandidate);
router.post(
  "/:id/rescore",
  protect,
  requireRole("recruiter", "admin"),
  aiScoringLimiter,
  rescoreCandidate
);
router.patch("/:id/stage", protect, requireRole("recruiter", "admin"), updateCandidateStage);
router.patch("/:id/assign", protect, requireRole("recruiter", "admin"), assignCandidate);
router.post("/:id/note", protect, requireRole("recruiter", "admin"), addCandidateNote);
router.post("/:id/interviews", protect, requireRole("recruiter", "admin"), addCandidateInterview);
router.patch("/:id/notes/:noteId", protect, requireRole("recruiter", "admin"), updateCandidateNote);
router.delete("/:id/notes/:noteId", protect, requireRole("recruiter", "admin"), deleteCandidateNote);
router.delete("/:id", protect, requireRole("recruiter", "admin"), deleteCandidate);

module.exports = router;
