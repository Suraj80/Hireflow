const mongoose = require("mongoose");

const auditActorSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const auditEntitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    id: {
      type: String,
      trim: true,
      default: "",
    },
    label: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: auditActorSchema,
      default: () => ({
        id: null,
        name: "",
        email: "",
        role: "",
      }),
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    entity: {
      type: auditEntitySchema,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    request: {
      ip: {
        type: String,
        trim: true,
        default: "",
      },
      userAgent: {
        type: String,
        trim: true,
        default: "",
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ "entity.type": 1, createdAt: -1 });
auditLogSchema.index({ "actor.id": 1, createdAt: -1 });
auditLogSchema.index({ "entity.id": 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
