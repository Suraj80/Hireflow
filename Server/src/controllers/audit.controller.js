const AuditLog = require("../models/AuditLog");

const allowedActions = [
  "all",
  "created",
  "updated",
  "deleted",
  "archived",
  "status-updated",
  "role-updated",
  "password-updated",
  "assigned",
  "note-added",
  "note-updated",
  "note-deleted",
  "stage-moved",
  "interview-scheduled",
  "interview-updated",
  "interview-rescheduled",
  "feedback-submitted",
  "login",
  "logout",
  "profile-updated",
  "settings-updated",
];

const allowedEntityTypes = [
  "all",
  "auth",
  "user",
  "job",
  "candidate",
  "interview",
  "settings",
];

const allowedCategories = [
  "all",
  "security",
  "users",
  "jobs",
  "candidates",
  "interviews",
  "settings",
];

const buildValidationError = (message, field = null) => ({
  message,
  ...(field
    ? {
        errors: [
          {
            field,
            message,
          },
        ],
      }
    : {}),
});

const normalizeAuditLog = (item) => ({
  id: item._id,
  actor: {
    id: item.actor?.id || null,
    name: item.actor?.name || "System",
    email: item.actor?.email || "",
    role: item.actor?.role || "",
  },
  action: item.action,
  category: item.category,
  entity: {
    type: item.entity?.type || "",
    id: item.entity?.id || "",
    label: item.entity?.label || "",
  },
  description: item.description,
  meta: item.meta || null,
  request: {
    ip: item.request?.ip || "",
    userAgent: item.request?.userAgent || "",
  },
  createdAt: item.createdAt,
});

const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = [10, 25, 50, 100].includes(Number(req.query.limit)) ? Number(req.query.limit) : 25;
    const search = String(req.query.search || "").trim();
    const action = String(req.query.action || "all").trim();
    const entityType = String(req.query.entityType || "all").trim();
    const category = String(req.query.category || "all").trim();
    const actorId = String(req.query.actorId || "").trim();
    const skip = (page - 1) * limit;

    if (!allowedActions.includes(action)) {
      return res.status(400).json(buildValidationError("Invalid action filter", "action"));
    }

    if (!allowedEntityTypes.includes(entityType)) {
      return res.status(400).json(buildValidationError("Invalid entity type filter", "entityType"));
    }

    if (!allowedCategories.includes(category)) {
      return res.status(400).json(buildValidationError("Invalid category filter", "category"));
    }

    const query = {};

    if (action !== "all") {
      query.action = action;
    }

    if (entityType !== "all") {
      query["entity.type"] = entityType;
    }

    if (category !== "all") {
      query.category = category;
    }

    if (actorId) {
      query["actor.id"] = actorId;
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { "entity.label": { $regex: search, $options: "i" } },
        { "actor.name": { $regex: search, $options: "i" } },
        { "actor.email": { $regex: search, $options: "i" } },
      ];
    }

    const [items, total, actors] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(query),
      AuditLog.aggregate([
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$actor.id",
            name: { $first: "$actor.name" },
            email: { $first: "$actor.email" },
            role: { $first: "$actor.role" },
          },
        },
        {
          $match: {
            _id: { $ne: null },
          },
        },
        { $sort: { name: 1, email: 1 } },
      ]),
    ]);

    return res.status(200).json({
      items: items.map(normalizeAuditLog),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      filters: {
        actions: allowedActions.filter((item) => item !== "all"),
        entityTypes: allowedEntityTypes.filter((item) => item !== "all"),
        categories: allowedCategories.filter((item) => item !== "all"),
        actors: actors.map((actor) => ({
          id: actor._id,
          name: actor.name || "Unknown",
          email: actor.email || "",
          role: actor.role || "",
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAuditLogs,
};
