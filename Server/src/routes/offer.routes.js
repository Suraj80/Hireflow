const express = require("express");
const {
  createOffer,
  deleteOffer,
  downloadOfferPdf,
  downloadPublicOfferPdf,
  getOfferById,
  getOffersMeta,
  getPublicOffer,
  listOffers,
  respondToOfferPublic,
  sendOffer,
  updateOffer,
  updateOfferStatus,
} = require("../controllers/offer.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, requireRole("recruiter", "admin"), listOffers);
router.get("/meta", protect, requireRole("recruiter", "admin"), getOffersMeta);
router.get("/public/:token", getPublicOffer);
router.get("/public/:token/pdf", downloadPublicOfferPdf);
router.post("/public/:token/respond", respondToOfferPublic);
router.get("/:id/pdf", protect, requireRole("recruiter", "admin"), downloadOfferPdf);
router.get("/:id", protect, requireRole("recruiter", "admin"), getOfferById);
router.post("/", protect, requireRole("recruiter", "admin"), createOffer);
router.patch("/:id", protect, requireRole("recruiter", "admin"), updateOffer);
router.post("/:id/send", protect, requireRole("recruiter", "admin"), sendOffer);
router.patch("/:id/status", protect, requireRole("recruiter", "admin"), updateOfferStatus);
router.delete("/:id", protect, requireRole("recruiter", "admin"), deleteOffer);

module.exports = router;
