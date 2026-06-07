const express = require("express");
const {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} = require("../controllers/notification.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, listNotifications);
router.patch("/:id/read", protect, markNotificationRead);
router.post("/read-all", protect, markAllNotificationsRead);

module.exports = router;
