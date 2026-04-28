const mongoose = require("mongoose");
const Candidate = require("../models/Candidate");
const Job = require("../models/Job");
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

const buildListQuery = ({ search, status, department, includeArchived }) => {
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

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { department: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ];
  }

  return query;
};

const listApplicantsCount = async (jobIds) => {
  const counts = await Candidate.aggregate([
    {
      $match: {
        appliedJob: {
          $in: jobIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    },
    {
      $group: {
        _id: "$appliedJob",
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
    const { page, limit, status, department, search, sort, includeArchived } = parsedQuery.data;
    const query = buildListQuery({ search, status, department, includeArchived });
    const skip = (page - 1) * limit;

    const [jobs, total, departments] = await Promise.all([
      Job.find(query)
        .populate("createdBy", "name email role")
        .populate("updatedBy", "name email role")
        .sort(applySort(sort))
        .skip(skip)
        .limit(limit),
      Job.countDocuments(query),
      Job.distinct("department", { archived: false }),
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
        departments,
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
      .populate("updatedBy", "name email role");

    if (!job || job.archived) {
      return res.status(404).json({ message: "Job not found" });
    }

    const applicantsCount = await Candidate.countDocuments({ appliedJob: job._id });

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
    const payload = parsedBody.data;
    const job = await Job.create({
      ...payload,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    const populatedJob = await Job.findById(job._id)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

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

    Object.assign(job, parsedBody.data, { updatedBy: req.user.id });
    await job.save();

    const populatedJob = await Job.findById(job._id)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");
    const applicantsCount = await Candidate.countDocuments({ appliedJob: job._id });

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

    return res.status(200).json({ message: "Job archived successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createJob,
  deleteJob,
  getJobById,
  getJobs,
  updateJob,
};
