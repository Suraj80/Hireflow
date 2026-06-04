const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema(
  {
    degree: {
      type: String,
      trim: true,
      default: "",
    },
    college: {
      type: String,
      trim: true,
      default: "",
    },
    year: {
      type: Number,
      min: 1950,
      max: 2100,
      default: null,
    },
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    years: {
      type: Number,
      min: 0,
      default: 0,
    },
    months: {
      type: Number,
      min: 0,
      max: 11,
      default: 0,
    },
  },
  { _id: false }
);

const resumeMetaSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      trim: true,
      default: "",
    },
    size: {
      type: Number,
      min: 0,
      default: 0,
    },
    mimeType: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const aiScoringStatusOptions = [
  "not-started",
  "queued",
  "processing",
  "completed",
  "failed",
  "unavailable",
];

const stageHistorySchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      enum: ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"],
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorName: {
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

const interviewSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    interviewers: {
      type: [String],
      default: [],
    },
    mode: {
      type: String,
      enum: ["Virtual", "Onsite", "Phone"],
      default: "Virtual",
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    feedback: {
      type: String,
      trim: true,
      default: "",
    },
  }
);

const candidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    altPhone: {
      type: String,
      trim: true,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    linkedin: {
      type: String,
      trim: true,
      default: "",
    },
    portfolio: {
      type: String,
      trim: true,
      default: "",
    },
    currentCompany: {
      type: String,
      trim: true,
      default: "",
    },
    currentRole: {
      type: String,
      trim: true,
      default: "",
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ["portal", "referral", "manual", "campus", "linkedin", "agency"],
      default: "manual",
    },
    referredBy: {
      type: String,
      trim: true,
      default: "",
    },
    expectedSalary: {
      type: Number,
      min: 0,
      default: null,
    },
    noticePeriod: {
      type: String,
      trim: true,
      default: "",
    },
    workAuthorization: {
      type: String,
      trim: true,
      default: "",
    },
    resumeUrl: {
      type: String,
      trim: true,
      default: "",
    },
    resumeMeta: {
      type: resumeMetaSchema,
      default: () => ({
        filename: "",
        size: 0,
        mimeType: "",
      }),
    },
    coverLetter: {
      type: String,
      trim: true,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    experience: {
      type: experienceSchema,
      default: () => ({
        years: 0,
        months: 0,
      }),
    },
    education: {
      type: [educationSchema],
      default: [],
    },
    certifications: {
      type: [String],
      default: [],
    },
    languages: {
      type: [String],
      default: [],
    },
    recruiterAssigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    stage: {
      type: String,
      enum: ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"],
      default: "Applied",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    aiScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    aiReasoning: {
      type: String,
      trim: true,
      default: "",
    },
    aiStatus: {
      type: String,
      enum: aiScoringStatusOptions,
      default: "not-started",
    },
    aiError: {
      type: String,
      trim: true,
      default: "",
    },
    aiScoredAt: {
      type: Date,
      default: null,
    },
    aiInputHash: {
      type: String,
      trim: true,
      default: "",
    },
    aiModel: {
      type: String,
      trim: true,
      default: "",
    },
    notesCount: {
      type: Number,
      default: 0,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Active", "Hired", "Rejected", "Archived"],
      default: "Active",
    },
    statusToken: {
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
    stageHistory: {
      type: [stageHistorySchema],
      default: [],
    },
    activityLog: {
      type: [activitySchema],
      default: [],
    },
    interviews: {
      type: [interviewSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

candidateSchema.index({ email: 1 });
candidateSchema.index({ jobId: 1 });
candidateSchema.index({ stage: 1 });
candidateSchema.index({ recruiterAssigned: 1 });
candidateSchema.index({ aiScore: -1 });
candidateSchema.index({ createdAt: -1 });
candidateSchema.index({ jobId: 1, email: 1 });

module.exports = mongoose.model("Candidate", candidateSchema);
