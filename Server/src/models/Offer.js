const mongoose = require("mongoose");

const offerStatusOptions = ["Draft", "Sent", "Accepted", "Declined", "Withdrawn", "Expired"];

const versionSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    salaryAmount: {
      type: Number,
      min: 0,
      default: null,
    },
    bonusAmount: {
      type: Number,
      min: 0,
      default: null,
    },
    equity: {
      type: String,
      trim: true,
      default: "",
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
    },
    startDate: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    letterHtml: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false }
);

const offerSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    salaryAmount: {
      type: Number,
      min: 0,
      default: null,
    },
    bonusAmount: {
      type: Number,
      min: 0,
      default: null,
    },
    equity: {
      type: String,
      trim: true,
      default: "",
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
    },
    startDate: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    letterHtml: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: offerStatusOptions,
      default: "Draft",
      index: true,
    },
    version: {
      type: Number,
      min: 1,
      default: 1,
    },
    versions: {
      type: [versionSchema],
      default: [],
    },
    publicToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    withdrawnAt: {
      type: Date,
      default: null,
    },
    decisionName: {
      type: String,
      trim: true,
      default: "",
    },
    decisionMessage: {
      type: String,
      trim: true,
      default: "",
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
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

offerSchema.index({ candidateId: 1, createdAt: -1 });
offerSchema.index({ status: 1, expiresAt: 1 });

module.exports = {
  Offer: mongoose.model("Offer", offerSchema),
  offerStatusOptions,
};
