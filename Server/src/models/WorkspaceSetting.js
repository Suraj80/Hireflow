const mongoose = require("mongoose");

const workspaceSettingSchema = new mongoose.Schema(
  {
    workspaceName: {
      type: String,
      required: true,
      trim: true,
      default: "HireFlow Workspace",
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      default: "HireFlow Labs",
    },
    defaultPipelineDisplay: {
      type: String,
      required: true,
      trim: true,
      default: "Applied -> Screening -> Interview -> Offer -> Hired",
    },
    defaultTimezone: {
      type: String,
      required: true,
      trim: true,
      default: "Asia/Kolkata",
    },
    defaultCurrency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "USD",
    },
    officeHours: {
      start: {
        type: String,
        required: true,
        trim: true,
        default: "09:00",
      },
      end: {
        type: String,
        required: true,
        trim: true,
        default: "18:00",
      },
    },
    officeWeek: {
      type: [String],
      default: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
    brandingLogo: {
      type: String,
      trim: true,
      default: "",
    },
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      inApp: {
        type: Boolean,
        default: true,
      },
      newApplications: {
        type: Boolean,
        default: true,
      },
      interviewReminders: {
        type: Boolean,
        default: true,
      },
      stageChanges: {
        type: Boolean,
        default: true,
      },
      dailyDigest: {
        type: Boolean,
        default: false,
      },
    },
    hiringPreferences: {
      defaultCandidateSource: {
        type: String,
        trim: true,
        default: "manual",
      },
      defaultJobStatus: {
        type: String,
        trim: true,
        default: "draft",
      },
      resumeFileSizeLimitMb: {
        type: Number,
        min: 1,
        max: 25,
        default: 5,
      },
      allowedResumeFormats: {
        type: [String],
        default: ["PDF", "DOC", "DOCX"],
      },
      duplicateApplicationWarning: {
        type: Boolean,
        default: true,
      },
    },
    security: {
      sessionTimeoutMinutes: {
        type: Number,
        min: 5,
        max: 1440,
        default: 15,
      },
      refreshTokenDurationDays: {
        type: Number,
        min: 1,
        max: 90,
        default: 7,
      },
      passwordMinLength: {
        type: Number,
        min: 6,
        max: 32,
        default: 6,
      },
      requireStrongPasswords: {
        type: Boolean,
        default: false,
      },
      twoFactorRequired: {
        type: Boolean,
        default: false,
      },
      loginActivityVisible: {
        type: Boolean,
        default: false,
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WorkspaceSetting", workspaceSettingSchema);
