const Notification = require("../models/Notification");

const normalizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user._id || user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

const mapNotification = (notification) => ({
  id: notification._id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  actor: normalizeUser(notification.actorId),
  entityType: notification.entityType,
  entityId: notification.entityId,
  entityLabel: notification.entityLabel,
  meta: notification.meta,
  readAt: notification.readAt,
  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt,
});

const listNotifications = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));

    const [items, unreadCount] = await Promise.all([
      Notification.find({ recipientId: req.user.id })
        .populate("actorId", "name email role")
        .sort({ createdAt: -1 })
        .limit(limit),
      Notification.countDocuments({ recipientId: req.user.id, readAt: null }),
    ]);

    return res.status(200).json({
      items: items.map(mapNotification),
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id },
      {
        $set: {
          readAt: new Date(),
        },
      },
      { new: true }
    ).populate("actorId", "name email role");

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const unreadCount = await Notification.countDocuments({
      recipientId: req.user.id,
      readAt: null,
    });

    return res.status(200).json({
      item: mapNotification(notification),
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user.id, readAt: null },
      {
        $set: {
          readAt: new Date(),
        },
      }
    );

    return res.status(200).json({ message: "Notifications marked as read", unreadCount: 0 });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
};
