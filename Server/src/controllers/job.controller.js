const mongoose = require("mongoose");
const Candidate = require("../models/Candidate");
const Department = require("../models/Department");
const Job = require("../models/Job");
const User = require("../models/User");
const { getMergedDepartments } = require("./department.controller");
const { createAuditLog } = require("../services/audit.service");
const { getHiringPreferences } = require("../services/workspace-settings.service");
const {
  jobCreateSchema,
  jobsQuerySchema,
  jobUpdateSchema,
} = require("../validation/job.validation");

const buildValidationError = (issues) => ({
  message: "Validation failed",
  errors: issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  })),
});

const canManageJob = (job, user) =>
  user && (user.role === "admin" || job.createdBy.toString() === user.id);

const sanitizePublicJob = (job) => ({
  id: job._id,
  title: job.title,
  department: job.department,
  descriptionHTML: job.descriptionHTML,
  type: job.type,
  location: job.location,
  remote: job.remote,
  salaryMin: job.showSalary ? job.salaryMin : null,
  salaryMax: job.showSalary ? job.salaryMax : null,
  currency: job.showSalary ? job.currency : null,
  showSalary: job.showSalary,
  requirements: job.requirements,
  tags: job.tags,
  deadline: job.deadline,
  visibility: job.visibility,
  status: job.status,
  createdAt: job.createdAt,
});

const normalizeJobResponse = (job, applicantsCount = 0) => ({
  id: job._id,
  title: job.title,
  department: job.department,
  hiringManager: job.hiringManager,
  hiringManagerId: job.hiringManagerId?._id?.toString?.() || job.hiringManagerId?.toString?.() || null,
  hiringManagerUser: job.hiringManagerId
    ? {
        id: job.hiringManagerId._id?.toString?.() || job.hiringManagerId.toString(),
        name: job.hiringManagerId.name,
        email: job.hiringManagerId.email,
        role: job.hiringManagerId.role,
      }
    : null,
  descriptionHTML: job.descriptionHTML,
  type: job.type,
  location: job.location,
  remote: job.remote,
  salaryMin: job.salaryMin,
  salaryMax: job.salaryMax,
  currency: job.currency,
  showSalary: job.showSalary,
  requirements: job.requirements,
  tags: job.tags,
  deadline: job.deadline,
  maxApplicants: job.maxApplicants,
  autoClose: job.autoClose,
  visibility: job.visibility,
  status: job.status,
  archived: job.archived,
  createdBy: job.createdBy,
  updatedBy: job.updatedBy,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  applicantsCount,
});

const applySort = (sort) => {
  switch (sort) {
    case "oldest":
      return { createdAt: 1 };
    case "deadline":
      return { deadline: 1, createdAt: -1 };
    case "newest":
    default:
      return { createdAt: -1 };
  }
};

const buildListQuery = ({ search, status, department, type, includeArchived }) => {
  const query = {};

  if (!includeArchived) {
    query.archived = false;
  }

  if (status && status !== "all") {
    query.status = status;
  }

  if (department && department !== "all") {
    query.department = department;
  }

  if (type && type !== "all") {
    query.type = type;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { department: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ];
  }

  return query;
};

const getHiringManagerRecord = async (hiringManagerId) => {
  if (!hiringManagerId) {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(hiringManagerId)) {
    return false;
  }

  return User.findById(hiringManagerId).select("name email role");
};

const isDepartmentAllowed = async (departmentName) => {
  const normalizedDepartment = String(departmentName || "").trim();

  if (!normalizedDepartment) {
    return false;
  }

  const [storedDepartment, legacyDepartment] = await Promise.all([
    Department.findOne({
      name: new RegExp(`^${normalizedDepartment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      isActive: true,
    }),
    Job.findOne({
      department: new RegExp(`^${normalizedDepartment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      archived: false,
    }).select("_id"),
  ]);

  return Boolean(storedDepartment || legacyDepartment);
};

const listApplicantsCount = async (jobIds) => {
  const counts = await Candidate.aggregate([
    {
      $match: {
        $or: [
          {
            jobId: {
              $in: jobIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
          },
          {
            appliedJob: {
              $in: jobIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
          },
        ],
      },
    },
    {
      $project: {
        normalizedJobId: {
          $ifNull: ["$jobId", "$appliedJob"],
        },
      },
    },
    {
      $group: {
        _id: "$normalizedJobId",
        count: { $sum: 1 },
      },
    },
  ]);

  return counts.reduce((accumulator, item) => {
    accumulator[item._id.toString()] = item.count;
    return accumulator;
  }, {});
};

const getJobs = async (req, res) => {
  const parsedQuery = jobsQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).json(buildValidationError(parsedQuery.error.issues));
  }

  try {
    const { page, limit, status, department, type, search, sort, includeArchived } = parsedQuery.data;
    const query = buildListQuery({ search, status, department, type, includeArchived });
    const skip = (page - 1) * limit;

    const [jobs, total, departments] = await Promise.all([
      Job.find(query)
        .populate("createdBy", "name email role")
        .populate("updatedBy", "name email role")
        .populate("hiringManagerId", "name email role")
        .sort(applySort(sort))
        .skip(skip)
        .limit(limit),
      Job.countDocuments(query),
      getMergedDepartments(),
    ]);

    const applicantsCountMap = await listApplicantsCount(jobs.map((job) => job._id.toString()));

    return res.status(200).json({
      items: jobs.map((job) => normalizeJobResponse(job, applicantsCountMap[job._id.toString()] || 0)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      filters: {
        departments: departments.filter((item) => item.isActive).map((item) => item.name),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("hiringManagerId", "name email role");

    if (!job || job.archived) {
      return res.status(404).json({ message: "Job not found" });
    }

    const applicantsCount = await Candidate.countDocuments({
      $or: [{ jobId: job._id }, { appliedJob: job._id }],
    });

    if (req.user) {
      return res.status(200).json(normalizeJobResponse(job, applicantsCount));
    }

    if (job.status !== "open" || job.visibility !== "public") {
      return res.status(403).json({ message: "This job is not publicly available" });
    }

    return res.status(200).json(sanitizePublicJob(job));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createJob = async (req, res) => {
  const parsedBody = jobCreateSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const hiringPreferences = await getHiringPreferences();
    const payload = {
      ...parsedBody.data,
      status:
        typeof req.body.status === "undefined"
          ? hiringPreferences.defaultJobStatus || "draft"
          : parsedBody.data.status,
    };
    const [departmentAllowed, hiringManagerRecord] = await Promise.all([
      isDepartmentAllowed(payload.department),
      getHiringManagerRecord(payload.hiringManagerId),
    ]);

    if (!departmentAllowed) {
      return res.status(400).json({ message: "Select a department from the workspace list" });
    }

    if (hiringManagerRecord === false) {
      return res.status(400).json({ message: "Selected hiring manager is invalid" });
    }

    const job = await Job.create({
      ...payload,
      hiringManager: hiringManagerRecord?.name || "",
      hiringManagerId: hiringManagerRecord?._id || null,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    const populatedJob = await Job.findById(job._id)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("hiringManagerId", "name email role");

    await createAuditLog({
      req,
      action: "created",
      category: "jobs",
      entity: {
        type: "job",
        id: job._id,
        label: job.title,
      },
      description: `Created job ${job.title}`,
      meta: {
        department: job.department,
        status: job.status,
        visibility: job.visibility,
      },
    });

    return res.status(201).json(normalizeJobResponse(populatedJob, 0));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || job.archived) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (!canManageJob(job, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const mergedPayload = {
      title: req.body.title ?? job.title,
      department: req.body.department ?? job.department,
      hiringManager: req.body.hiringManager ?? job.hiringManager,
      hiringManagerId: typeof req.body.hiringManagerId === "undefined" ? job.hiringManagerId?.toString?.() || null : req.body.hiringManagerId,
      descriptionHTML: req.body.descriptionHTML ?? job.descriptionHTML,
      type: req.body.type ?? job.type,
      location: req.body.location ?? job.location,
      remote: req.body.remote ?? job.remote,
      salaryMin: typeof req.body.salaryMin === "undefined" ? job.salaryMin : req.body.salaryMin,
      salaryMax: typeof req.body.salaryMax === "undefined" ? job.salaryMax : req.body.salaryMax,
      currency: req.body.currency ?? job.currency,
      showSalary: req.body.showSalary ?? job.showSalary,
      requirements: req.body.requirements ?? job.requirements,
      tags: req.body.tags ?? job.tags,
      deadline: typeof req.body.deadline === "undefined" ? job.deadline : req.body.deadline,
      maxApplicants: typeof req.body.maxApplicants === "undefined" ? job.maxApplicants : req.body.maxApplicants,
      autoClose: req.body.autoClose ?? job.autoClose,
      visibility: req.body.visibility ?? job.visibility,
      status: req.body.status ?? job.status,
    };
    const parsedBody = jobUpdateSchema.safeParse(mergedPayload);

    if (!parsedBody.success) {
      return res.status(400).json(buildValidationError(parsedBody.error.issues));
    }

    const [departmentAllowed, hiringManagerRecord] = await Promise.all([
      parsedBody.data.department === job.department
        ? true
        : isDepartmentAllowed(parsedBody.data.department),
      getHiringManagerRecord(parsedBody.data.hiringManagerId),
    ]);

    if (!departmentAllowed) {
      return res.status(400).json({ message: "Select a department from the workspace list" });
    }

    if (hiringManagerRecord === false) {
      return res.status(400).json({ message: "Selected hiring manager is invalid" });
    }

    Object.assign(job, parsedBody.data, {
      hiringManager: hiringManagerRecord?.name || "",
      hiringManagerId: hiringManagerRecord?._id || null,
      updatedBy: req.user.id,
    });
    await job.save();

    await createAuditLog({
      req,
      action: "updated",
      category: "jobs",
      entity: {
        type: "job",
        id: job._id,
        label: job.title,
      },
      description: `Updated job ${job.title}`,
      meta: {
        department: job.department,
        status: job.status,
        visibility: job.visibility,
      },
    });

    const populatedJob = await Job.findById(job._id)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("hiringManagerId", "name email role");
    const applicantsCount = await Candidate.countDocuments({
      $or: [{ jobId: job._id }, { appliedJob: job._id }],
    });

    return res.status(200).json(normalizeJobResponse(populatedJob, applicantsCount));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || job.archived) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (!canManageJob(job, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    job.archived = true;
    job.status = "closed";
    job.updatedBy = req.user.id;
    await job.save();

    await createAuditLog({
      req,
      action: "archived",
      category: "jobs",
      entity: {
        type: "job",
        id: job._id,
        label: job.title,
      },
      description: `Archived job ${job.title}`,
      meta: {
        status: job.status,
      },
    });

    return res.status(200).json({ message: "Job archived successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getJobMeta = async (_req, res) => {
  try {
    const [departments, hiringManagers] = await Promise.all([
      getMergedDepartments(),
      User.find({}).select("name email role").sort({ name: 1, email: 1 }),
    ]);

    return res.status(200).json({
      departments: departments.filter((item) => item.isActive),
      hiringManagers: hiringManagers.map((user) => ({
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createJob,
  deleteJob,
  getJobById,
  getJobMeta,
  getJobs,
  updateJob,
};
