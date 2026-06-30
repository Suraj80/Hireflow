const User = require("../models/User");
const AuditLog = require("../models/AuditLog");

const toPlainId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return value._id?.toString?.() || value.id?.toString?.() || value.toString?.() || "";
};

const deriveRequestDetails = (req) => ({
  ip:
    req?.headers?.["x-forwarded-for"]?.toString?.().split(",")[0]?.trim() ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    "",
  userAgent: String(req?.get?.("user-agent") || req?.headers?.["user-agent"] || "").trim(),
});

const resolveActor = async ({ actor = null, req = null }) => {
  const actorPayload = actor || req?.user || null;

  if (!actorPayload) {
    return {
      id: null,
      name: "",
      email: "",
      role: "",
    };
  }

  const resolved = {
    id: actorPayload.id || actorPayload._id || null,
    name: actorPayload.name || "",
    email: actorPayload.email || "",
    role: actorPayload.role || "",
  };

  if (resolved.id && (!resolved.name || !resolved.email)) {
    const user = await User.findById(resolved.id).select("name email role").lean();
    if (user) {
      resolved.name = resolved.name || user.name || "";
      resolved.email = resolved.email || user.email || "";
      resolved.role = resolved.role || user.role || "";
    }
  }

  return resolved;
};

const createAuditLog = async ({
  req = null,
  actor = null,
  action,
  category,
  entity,
  description,
  meta = null,
}) => {
  if (!action || !category || !entity?.type || !description) {
    return null;
  }

  const request = deriveRequestDetails(req);
  const actorPayload = await resolveActor({ actor, req });

  return AuditLog.create({
    actor: actorPayload,
    action,
    category,
    entity: {
      type: entity.type,
      id: entity.id ? String(entity.id) : "",
      label: entity.label || "",
    },
    description,
    meta,
    request,
  });
};

const buildAuditDescription = ({ action, entityLabel, context = "" }) => {
  const target = entityLabel ? ` ${entityLabel}` : "";
  return `${action}${target}${context ? ` ${context}` : ""}`.trim();
};

module.exports = {
  buildAuditDescription,
  createAuditLog,
  toPlainId,
};
