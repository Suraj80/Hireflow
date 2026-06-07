const crypto = require("crypto");
const Candidate = require("../models/Candidate");
const Job = require("../models/Job");
const WorkspaceSetting = require("../models/WorkspaceSetting");
const { Offer, offerStatusOptions } = require("../models/Offer");
const { createAuditLog } = require("../services/audit.service");
const {
  notifyCandidateStageChange,
  notifyOfferEvent,
} = require("../services/notification.service");
const {
  offerCreateSchema,
  offerListQuerySchema,
  offerSendSchema,
  offerStatusSchema,
  offerUpdateSchema,
  publicOfferDecisionSchema,
} = require("../validation/offer.validation");

const buildValidationError = (issues) => ({
  message: "Validation failed",
  errors: issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  })),
});

const generateOfferToken = () => crypto.randomBytes(18).toString("hex");

const deriveStatusFromStage = (stage, archived = false) => {
  if (archived) {
    return "Archived";
  }

  if (stage === "Rejected") {
    return "Rejected";
  }

  if (stage === "Hired") {
    return "Hired";
  }

  return "Active";
};

const normalizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user._id || user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

const normalizeCandidate = (candidate) => {
  if (!candidate) {
    return null;
  }

  return {
    id: candidate._id || candidate.id,
    name: candidate.name,
    email: candidate.email,
    stage: candidate.stage,
    recruiterAssigned: normalizeUser(candidate.recruiterAssigned),
  };
};

const normalizeJob = (job) => {
  if (!job) {
    return null;
  }

  return {
    id: job._id || job.id,
    title: job.title,
    department: job.department,
    location: job.location,
  };
};

const getClientBaseUrl = () =>
  (process.env.PUBLIC_CLIENT_URL || process.env.CLIENT_ORIGIN || "http://localhost:8080")
    .split(",")[0]
    .trim()
    .replace(/\/+$/g, "");

const buildOfferShareUrl = (publicToken) => `${getClientBaseUrl()}/offers/${publicToken}`;

const buildDefaultLetterHtml = ({ candidateName, title, salaryAmount, currency, startDate, companyName }) => {
  const salaryText =
    salaryAmount === null || typeof salaryAmount === "undefined"
      ? "the compensation package discussed with you"
      : `${currency} ${Number(salaryAmount).toLocaleString()}`;

  const startDateText = startDate ? new Date(startDate).toLocaleDateString() : "a mutually agreed start date";

  return [
    `<p>Dear ${candidateName},</p>`,
    `<p>We are pleased to offer you the position of <strong>${title}</strong> at <strong>${companyName}</strong>.</p>`,
    `<p>Your proposed base salary is <strong>${salaryText}</strong>, with an expected start date of <strong>${startDateText}</strong>.</p>`,
    "<p>Please review this offer carefully and respond before the expiration date listed below.</p>",
    `<p>Sincerely,<br />${companyName}</p>`,
  ].join("");
};

const createVersionSnapshot = (offer, changedBy) => ({
  version: offer.version,
  title: offer.title,
  salaryAmount: offer.salaryAmount,
  bonusAmount: offer.bonusAmount,
  equity: offer.equity,
  currency: offer.currency,
  startDate: offer.startDate,
  expiresAt: offer.expiresAt,
  letterHtml: offer.letterHtml,
  notes: offer.notes,
  changedAt: new Date(),
  changedBy,
});

const syncExpiredOffers = async () => {
  const now = new Date();
  await Offer.updateMany(
    {
      deletedAt: null,
      status: { $in: ["Draft", "Sent"] },
      expiresAt: { $ne: null, $lt: now },
    },
    {
      $set: {
        status: "Expired",
      },
    }
  );
};

const mapOffer = (offer) => ({
  id: offer._id,
  candidate: normalizeCandidate(offer.candidateId),
  job: normalizeJob(offer.jobId),
  title: offer.title,
  salaryAmount: offer.salaryAmount,
  bonusAmount: offer.bonusAmount,
  equity: offer.equity,
  currency: offer.currency,
  startDate: offer.startDate,
  expiresAt: offer.expiresAt,
  letterHtml: offer.letterHtml,
  notes: offer.notes,
  status: offer.status,
  version: offer.version,
  versions: (offer.versions || []).map((entry) => ({
    version: entry.version,
    title: entry.title,
    salaryAmount: entry.salaryAmount,
    bonusAmount: entry.bonusAmount,
    equity: entry.equity,
    currency: entry.currency,
    startDate: entry.startDate,
    expiresAt: entry.expiresAt,
    letterHtml: entry.letterHtml,
    notes: entry.notes,
    changedAt: entry.changedAt,
    changedBy: normalizeUser(entry.changedBy),
  })),
  shareUrl: buildOfferShareUrl(offer.publicToken),
  sentAt: offer.sentAt,
  respondedAt: offer.respondedAt,
  withdrawnAt: offer.withdrawnAt,
  decisionName: offer.decisionName,
  decisionMessage: offer.decisionMessage,
  createdBy: normalizeUser(offer.createdBy),
  updatedBy: normalizeUser(offer.updatedBy),
  createdAt: offer.createdAt,
  updatedAt: offer.updatedAt,
});

const syncCandidateStage = async ({ candidate, nextStage, actorId, actorName, reason }) => {
  if (!candidate || candidate.stage === nextStage) {
    return candidate;
  }

  const previousStage = candidate.stage;
  candidate.stage = nextStage;
  candidate.status = deriveStatusFromStage(nextStage, candidate.archived);
  candidate.updatedBy = actorId;
  candidate.stageHistory.unshift({
    stage: nextStage,
    changedBy: actorId,
    changedAt: new Date(),
    reason,
  });
  candidate.activityLog.unshift({
    type: "stage-change",
    title: `Moved to ${nextStage}`,
    description: reason,
    actorId,
    actorName,
    createdAt: new Date(),
    meta: {
      previousStage,
      nextStage,
      source: "offer-management",
    },
  });
  await candidate.save();

  await notifyCandidateStageChange({
    candidate,
    previousStage,
    nextStage,
    actorId,
    reason,
  });

  return candidate;
};

const loadOfferDependencies = async (candidateId) => {
  const candidate = await Candidate.findById(candidateId)
    .populate("jobId", "title department location salaryMin salaryMax currency")
    .populate("recruiterAssigned", "name email role")
    .populate("createdBy", "name email role");

  if (!candidate || candidate.archived) {
    return { error: { status: 404, message: "Candidate not found" } };
  }

  if (!candidate.jobId) {
    return { error: { status: 400, message: "Candidate is not linked to a job" } };
  }

  return { candidate, job: candidate.jobId };
};

const getOffersMeta = async (_req, res) => {
  try {
    const candidates = await Candidate.find({
      archived: false,
      stage: { $in: ["Interview", "Offer", "Hired", "Rejected"] },
    })
      .select("name email stage jobId recruiterAssigned")
      .populate("jobId", "title department location")
      .populate("recruiterAssigned", "name email role")
      .sort({ updatedAt: -1 })
      .limit(200);

    return res.status(200).json({
      candidates: candidates.map((candidate) => ({
        id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        stage: candidate.stage,
        recruiterAssigned: normalizeUser(candidate.recruiterAssigned),
        job: normalizeJob(candidate.jobId),
      })),
      statuses: offerStatusOptions,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const listOffers = async (req, res) => {
  const parsedQuery = offerListQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json(buildValidationError(parsedQuery.error.issues));
  }

  try {
    await syncExpiredOffers();

    const filters = parsedQuery.data;
    const query = {
      deletedAt: null,
    };

    if (filters.status !== "all") {
      query.status = filters.status;
    }

    if (filters.search) {
      query.$or = [{ title: { $regex: filters.search, $options: "i" } }];
    }

    const skip = (filters.page - 1) * filters.limit;

    const [items, total] = await Promise.all([
      Offer.find(query)
        .populate("candidateId", "name email stage recruiterAssigned")
        .populate("candidateId.recruiterAssigned", "name email role")
        .populate("jobId", "title department location")
        .populate("createdBy", "name email role")
        .populate("updatedBy", "name email role")
        .populate("versions.changedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filters.limit),
      Offer.countDocuments(query),
    ]);

    const filteredItems = filters.search
      ? items.filter((item) => {
          const search = filters.search.toLowerCase();
          return (
            item.title.toLowerCase().includes(search) ||
            item.candidateId?.name?.toLowerCase().includes(search) ||
            item.jobId?.title?.toLowerCase().includes(search)
          );
        })
      : items;

    return res.status(200).json({
      items: filteredItems.map(mapOffer),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      },
      filters: {
        statuses: offerStatusOptions,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getOfferById = async (req, res) => {
  try {
    await syncExpiredOffers();

    const offer = await Offer.findOne({ _id: req.params.id, deletedAt: null })
      .populate("candidateId", "name email stage recruiterAssigned")
      .populate("candidateId.recruiterAssigned", "name email role")
      .populate("jobId", "title department location")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("versions.changedBy", "name email role");

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    return res.status(200).json(mapOffer(offer));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createOffer = async (req, res) => {
  const parsedBody = offerCreateSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const dependencyState = await loadOfferDependencies(parsedBody.data.candidateId);
    if (dependencyState.error) {
      return res.status(dependencyState.error.status).json({ message: dependencyState.error.message });
    }

    const { candidate, job } = dependencyState;
    const existingActiveOffer = await Offer.findOne({
      candidateId: candidate._id,
      deletedAt: null,
      status: { $in: ["Draft", "Sent"] },
    }).select("_id status");

    if (existingActiveOffer) {
      return res.status(409).json({ message: "This candidate already has an active offer in progress" });
    }

    const workspaceSettings = await WorkspaceSetting.findOne().select("companyName");
    const payload = parsedBody.data;
    const letterHtml =
      payload.letterHtml ||
      buildDefaultLetterHtml({
        candidateName: candidate.name,
        title: payload.title,
        salaryAmount: payload.salaryAmount,
        currency: payload.currency,
        startDate: payload.startDate,
        companyName: workspaceSettings?.companyName || "HireFlow",
      });

    const offer = await Offer.create({
      candidateId: candidate._id,
      jobId: job._id,
      title: payload.title,
      salaryAmount:
        payload.salaryAmount === null && job.salaryMax !== null ? job.salaryMax : payload.salaryAmount,
      bonusAmount: payload.bonusAmount,
      equity: payload.equity,
      currency: payload.currency || job.currency || "USD",
      startDate: payload.startDate ? new Date(payload.startDate) : null,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      letterHtml,
      notes: payload.notes,
      status: "Draft",
      version: 1,
      versions: [],
      publicToken: generateOfferToken(),
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    await syncCandidateStage({
      candidate,
      nextStage: "Offer",
      actorId: req.user.id,
      actorName: req.user.name || req.user.role,
      reason: "Offer created",
    });

    await createAuditLog({
      req,
      action: "offer-created",
      category: "offers",
      entity: {
        type: "offer",
        id: offer._id,
        label: `${candidate.name} - ${offer.title}`,
      },
      description: `Created offer for ${candidate.name}`,
      meta: {
        candidateId: candidate._id,
        jobId: job._id,
        version: offer.version,
        status: offer.status,
      },
    });

    await notifyOfferEvent({
      offer,
      candidate,
      job,
      actorId: req.user.id,
      type: "offer-created",
      title: "Offer created",
      message: `A draft offer was created for ${candidate.name}.`,
    });

    const hydrated = await Offer.findById(offer._id)
      .populate("candidateId", "name email stage recruiterAssigned")
      .populate("candidateId.recruiterAssigned", "name email role")
      .populate("jobId", "title department location")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("versions.changedBy", "name email role");

    return res.status(201).json(mapOffer(hydrated));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateOffer = async (req, res) => {
  const parsedBody = offerUpdateSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    const offer = await Offer.findOne({ _id: req.params.id, deletedAt: null });
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (["Accepted", "Declined", "Withdrawn", "Expired"].includes(offer.status)) {
      return res.status(400).json({ message: "Finalized offers cannot be edited" });
    }

    const trackedKeys = [
      "title",
      "salaryAmount",
      "bonusAmount",
      "equity",
      "currency",
      "startDate",
      "expiresAt",
      "letterHtml",
      "notes",
    ];

    const hasTrackedChange = trackedKeys.some((key) => Object.prototype.hasOwnProperty.call(parsedBody.data, key));

    if (hasTrackedChange) {
      offer.versions.unshift(createVersionSnapshot(offer, req.user.id));
      offer.version += 1;
    }

    Object.entries(parsedBody.data).forEach(([key, value]) => {
      if (key === "startDate" || key === "expiresAt") {
        offer[key] = value ? new Date(value) : null;
      } else {
        offer[key] = value;
      }
    });
    offer.updatedBy = req.user.id;

    await offer.save();

    const [candidate, job] = await Promise.all([
      Candidate.findById(offer.candidateId)
        .populate("recruiterAssigned", "name email role")
        .populate("createdBy", "name email role"),
      Job.findById(offer.jobId).select("title department location"),
    ]);

    await createAuditLog({
      req,
      action: "offer-updated",
      category: "offers",
      entity: {
        type: "offer",
        id: offer._id,
        label: `${candidate?.name || "Candidate"} - ${offer.title}`,
      },
      description: `Updated offer for ${candidate?.name || "candidate"}`,
      meta: {
        version: offer.version,
        status: offer.status,
      },
    });

    await notifyOfferEvent({
      offer,
      candidate,
      job,
      actorId: req.user.id,
      type: "offer-updated",
      title: "Offer updated",
      message: `Offer details for ${candidate?.name || "candidate"} were updated to version ${offer.version}.`,
    });

    const hydrated = await Offer.findById(offer._id)
      .populate("candidateId", "name email stage recruiterAssigned")
      .populate("candidateId.recruiterAssigned", "name email role")
      .populate("jobId", "title department location")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("versions.changedBy", "name email role");

    return res.status(200).json(mapOffer(hydrated));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const sendOffer = async (req, res) => {
  const parsedBody = offerSendSchema.safeParse(req.body || {});
  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    await syncExpiredOffers();

    const offer = await Offer.findOne({ _id: req.params.id, deletedAt: null });
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (["Accepted", "Declined", "Withdrawn", "Expired"].includes(offer.status)) {
      return res.status(400).json({ message: "This offer can no longer be sent" });
    }

    offer.status = "Sent";
    offer.sentAt = offer.sentAt || new Date();
    offer.updatedBy = req.user.id;
    await offer.save();

    const candidate = await Candidate.findById(offer.candidateId)
      .populate("recruiterAssigned", "name email role")
      .populate("createdBy", "name email role");
    const job = await Job.findById(offer.jobId).select("title department location");

    await syncCandidateStage({
      candidate,
      nextStage: "Offer",
      actorId: req.user.id,
      actorName: req.user.name || req.user.role,
      reason: "Offer sent",
    });

    await createAuditLog({
      req,
      action: "offer-sent",
      category: "offers",
      entity: {
        type: "offer",
        id: offer._id,
        label: `${candidate?.name || "Candidate"} - ${offer.title}`,
      },
      description: `Sent offer to ${candidate?.name || "candidate"}`,
      meta: {
        status: offer.status,
        sentAt: offer.sentAt,
        shareUrl: buildOfferShareUrl(offer.publicToken),
      },
    });

    await notifyOfferEvent({
      offer,
      candidate,
      job,
      actorId: req.user.id,
      type: "offer-sent",
      title: "Offer sent",
      message: `Offer for ${candidate?.name || "candidate"} is ready for review.`,
      meta: {
        shareUrl: buildOfferShareUrl(offer.publicToken),
        message: parsedBody.data.message,
      },
    });

    const hydrated = await Offer.findById(offer._id)
      .populate("candidateId", "name email stage recruiterAssigned")
      .populate("candidateId.recruiterAssigned", "name email role")
      .populate("jobId", "title department location")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("versions.changedBy", "name email role");

    return res.status(200).json(mapOffer(hydrated));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateOfferStatus = async (req, res) => {
  const parsedBody = offerStatusSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    await syncExpiredOffers();

    const offer = await Offer.findOne({ _id: req.params.id, deletedAt: null });
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    offer.status = parsedBody.data.status;
    offer.updatedBy = req.user.id;

    if (parsedBody.data.status === "Accepted" || parsedBody.data.status === "Declined") {
      offer.respondedAt = new Date();
    }

    if (parsedBody.data.status === "Withdrawn") {
      offer.withdrawnAt = new Date();
    }

    if (parsedBody.data.message) {
      offer.decisionMessage = parsedBody.data.message;
    }

    await offer.save();

    const candidate = await Candidate.findById(offer.candidateId)
      .populate("recruiterAssigned", "name email role")
      .populate("createdBy", "name email role");
    const job = await Job.findById(offer.jobId).select("title department location");

    if (parsedBody.data.status === "Accepted") {
      await syncCandidateStage({
        candidate,
        nextStage: "Hired",
        actorId: req.user.id,
        actorName: req.user.name || req.user.role,
        reason: "Offer accepted",
      });
    }

    if (parsedBody.data.status === "Declined") {
      await syncCandidateStage({
        candidate,
        nextStage: "Rejected",
        actorId: req.user.id,
        actorName: req.user.name || req.user.role,
        reason: "Offer declined",
      });
    }

    await createAuditLog({
      req,
      action: "offer-status-updated",
      category: "offers",
      entity: {
        type: "offer",
        id: offer._id,
        label: `${candidate?.name || "Candidate"} - ${offer.title}`,
      },
      description: `Updated offer status to ${offer.status}`,
      meta: {
        status: offer.status,
        message: parsedBody.data.message,
      },
    });

    await notifyOfferEvent({
      offer,
      candidate,
      job,
      actorId: req.user.id,
      type: `offer-${offer.status.toLowerCase()}`,
      title: `Offer ${offer.status.toLowerCase()}`,
      message:
        parsedBody.data.message ||
        `${candidate?.name || "Candidate"}'s offer is now ${offer.status.toLowerCase()}.`,
    });

    const hydrated = await Offer.findById(offer._id)
      .populate("candidateId", "name email stage recruiterAssigned")
      .populate("candidateId.recruiterAssigned", "name email role")
      .populate("jobId", "title department location")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("versions.changedBy", "name email role");

    return res.status(200).json(mapOffer(hydrated));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findOne({ _id: req.params.id, deletedAt: null });
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    offer.deletedAt = new Date();
    offer.updatedBy = req.user.id;
    await offer.save();

    await createAuditLog({
      req,
      action: "offer-deleted",
      category: "offers",
      entity: {
        type: "offer",
        id: offer._id,
        label: offer.title,
      },
      description: `Deleted offer ${offer.title}`,
      meta: {
        candidateId: offer.candidateId,
      },
    });

    return res.status(200).json({ message: "Offer deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPublicOffer = async (req, res) => {
  try {
    await syncExpiredOffers();

    const offer = await Offer.findOne({ publicToken: req.params.token, deletedAt: null })
      .populate("candidateId", "name email")
      .populate("jobId", "title department location");

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    const workspaceSettings = await WorkspaceSetting.findOne().select("companyName");

    return res.status(200).json({
      candidateName: offer.candidateId?.name || "Candidate",
      candidateEmail: offer.candidateId?.email || "",
      jobTitle: offer.jobId?.title || offer.title,
      department: offer.jobId?.department || "",
      location: offer.jobId?.location || "",
      title: offer.title,
      salaryAmount: offer.salaryAmount,
      bonusAmount: offer.bonusAmount,
      equity: offer.equity,
      currency: offer.currency,
      startDate: offer.startDate,
      expiresAt: offer.expiresAt,
      letterHtml: offer.letterHtml,
      notes: offer.notes,
      status: offer.status,
      version: offer.version,
      companyName: workspaceSettings?.companyName || "HireFlow",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const respondToOfferPublic = async (req, res) => {
  const parsedBody = publicOfferDecisionSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json(buildValidationError(parsedBody.error.issues));
  }

  try {
    await syncExpiredOffers();

    const offer = await Offer.findOne({ publicToken: req.params.token, deletedAt: null });
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (offer.status === "Expired") {
      return res.status(400).json({ message: "This offer has expired" });
    }

    if (offer.status === "Withdrawn") {
      return res.status(400).json({ message: "This offer has been withdrawn" });
    }

    if (["Accepted", "Declined"].includes(offer.status)) {
      return res.status(400).json({ message: "This offer has already been finalized" });
    }

    offer.status = parsedBody.data.decision;
    offer.respondedAt = new Date();
    offer.decisionName = parsedBody.data.signatureName;
    offer.decisionMessage = parsedBody.data.message;
    await offer.save();

    const candidate = await Candidate.findById(offer.candidateId)
      .populate("recruiterAssigned", "name email role")
      .populate("createdBy", "name email role");
    const job = await Job.findById(offer.jobId).select("title department location");

    if (parsedBody.data.decision === "Accepted") {
      await syncCandidateStage({
        candidate,
        nextStage: "Hired",
        actorId: offer.updatedBy,
        actorName: parsedBody.data.signatureName,
        reason: "Offer accepted by candidate",
      });
    }

    if (parsedBody.data.decision === "Declined") {
      await syncCandidateStage({
        candidate,
        nextStage: "Rejected",
        actorId: offer.updatedBy,
        actorName: parsedBody.data.signatureName,
        reason: "Offer declined by candidate",
      });
    }

    await createAuditLog({
      action: "offer-responded",
      category: "offers",
      actor: {
        id: null,
        name: parsedBody.data.signatureName,
        email: candidate?.email || "",
        role: "candidate",
      },
      entity: {
        type: "offer",
        id: offer._id,
        label: `${candidate?.name || "Candidate"} - ${offer.title}`,
      },
      description: `${parsedBody.data.signatureName} ${parsedBody.data.decision.toLowerCase()} the offer`,
      meta: {
        status: offer.status,
        decisionMessage: parsedBody.data.message,
      },
    });

    await notifyOfferEvent({
      offer,
      candidate,
      job,
      actorId: null,
      type: `offer-${offer.status.toLowerCase()}`,
      title: `Offer ${offer.status.toLowerCase()}`,
      message: `${candidate?.name || "Candidate"} ${offer.status.toLowerCase()} the offer.`,
      meta: {
        decisionName: parsedBody.data.signatureName,
        decisionMessage: parsedBody.data.message,
      },
    });

    return res.status(200).json({
      message: `Offer ${offer.status.toLowerCase()} successfully`,
      status: offer.status,
      candidateName: candidate?.name || "Candidate",
      jobTitle: job?.title || offer.title,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOffer,
  deleteOffer,
  getOfferById,
  getOffersMeta,
  getPublicOffer,
  listOffers,
  respondToOfferPublic,
  sendOffer,
  updateOffer,
  updateOfferStatus,
};
