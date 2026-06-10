const mongoose = require("mongoose");

const requirementSchema = new mongoose.Schema(
  {
    skills: {
      type: [String],
      default: [],
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
      default: null,
    },
    qualification: {
      type: String,
      trim: true,
      default: "",
    },
    certifications: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const aiEmbeddingSchema = new mongoose.Schema(
  {
    values: {
      type: [Number],
      default: [],
    },
    model: {
      type: String,
      trim: true,
      default: "",
    },
    textHash: {
      type: String,
      trim: true,
      default: "",
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    hiringManager: {
      type: String,
      trim: true,
      default: "",
    },
    hiringManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    descriptionHTML: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["full-time", "part-time", "contract", "internship"],
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    workMode: {
      type: String,
      enum: ["onsite", "hybrid", "remote"],
      default: "onsite",
    },
    remote: {
      type: Boolean,
      default: false,
    },
    salaryMin: {
      type: Number,
      min: 0,
      default: null,
    },
    salaryMax: {
      type: Number,
      min: 0,
      default: null,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
    },
    showSalary: {
      type: Boolean,
      default: false,
    },
    requirements: {
      type: requirementSchema,
      default: () => ({
        skills: [],
        yearsOfExperience: null,
        qualification: "",
        certifications: [],
      }),
    },
    tags: {
      type: [String],
      default: [],
    },
    deadline: {
      type: Date,
      default: null,
    },
    maxApplicants: {
      type: Number,
      min: 1,
      default: null,
    },
    autoClose: {
      type: Boolean,
      default: false,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    status: {
      type: String,
      enum: ["draft", "open", "closed"],
      default: "draft",
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
    archived: {
      type: Boolean,
      default: false,
    },
    aiEmbedding: {
      type: aiEmbeddingSchema,
      default: () => ({
        values: [],
        model: "",
        textHash: "",
        updatedAt: null,
      }),
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ status: 1 });
jobSchema.index({ createdBy: 1 });
jobSchema.index({ tags: 1 });
jobSchema.index({ department: 1 });
jobSchema.index({ hiringManagerId: 1 });
jobSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Job", jobSchema);
