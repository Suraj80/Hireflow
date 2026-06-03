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
    brandingLogo: {
      type: String,
      trim: true,
      default: "",
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
