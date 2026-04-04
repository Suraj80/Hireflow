const express = require("express");
const {
  createCandidate,
  getCandidates,
  updateCandidate,
  deleteCandidate,
} = require("../controllers/candidate.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, getCandidates);
router.post("/", protect, createCandidate);
router.put("/:id", protect, updateCandidate);
router.delete("/:id", protect, deleteCandidate);

module.exports = router;
