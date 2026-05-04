const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["invite", "reminder", "reschedule", "cancellation", "feedback-request", "status-update"],
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    recipients: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  },
  { _id: false }
);

const auditEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    interviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    strengths: {
      type: String,
      trim: true,
      default: "",
    },
    concerns: {
      type: String,
      trim: true,
      default: "",
    },
    recommendation: {
      type: String,
      enum: ["Strong Hire", "Hire", "Leaning Hire", "No Hire", "Strong No Hire"],
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const interviewSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    round: {
      type: String,
      trim: true,
      required: true,
    },
    type: {
      type: String,
      enum: ["Video", "Onsite", "Phone", "Panel", "Technical"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Scheduled", "Confirmed", "Completed", "Cancelled", "Rescheduled"],
      default: "Scheduled",
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      min: 15,
      max: 480,
      required: true,
    },
    timezone: {
      type: String,
      trim: true,
      default: "UTC",
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    meetLink: {
      type: String,
      trim: true,
      default: "",
    },
    interviewers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    leadInterviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    agenda: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    reminderSettings: {
      type: [Number],
      default: [1440, 60],
    },
    sendInvite: {
      type: Boolean,
      default: true,
    },
    feedback: {
      type: [feedbackSchema],
      default: [],
    },
    notifications: {
      type: [notificationSchema],
      default: [],
    },
    auditTrail: {
      type: [auditEntrySchema],
      default: [],
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cancelledReason: {
      type: String,
      trim: true,
      default: "",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

interviewSchema.index({ scheduledAt: 1 });
interviewSchema.index({ candidateId: 1 });
interviewSchema.index({ status: 1 });
interviewSchema.index({ interviewers: 1 });

module.exports = mongoose.model("Interview", interviewSchema);
