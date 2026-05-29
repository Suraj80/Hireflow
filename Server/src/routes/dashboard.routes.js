const express = require("express");
const { getDashboardOverview } = require("../controllers/dashboard.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/overview", protect, getDashboardOverview);

module.exports = router;
