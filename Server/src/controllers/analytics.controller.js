const mongoose = require("mongoose");
const Candidate = require("../models/Candidate");
const Job = require("../models/Job");
const Interview = require("../models/Interview");

const buildObjectId = (value) => new mongoose.Types.ObjectId(value);

const buildCreatedAtRange = (from, to) => {
  if (!from && !to) {
    return null;
  }

  const range = {};

  if (from) {
    range.$gte = new Date(from);
  }

  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }

  return range;
};

const buildCandidateMatch = (query) => {
  const match = { archived: false };
  const createdAtRange = buildCreatedAtRange(query.from, query.to);

  if (query.jobId && mongoose.Types.ObjectId.isValid(query.jobId)) {
    match.jobId = buildObjectId(query.jobId);
  }

  if (createdAtRange) {
    match.createdAt = createdAtRange;
  }

  return match;
};

const buildJobMatch = (query) => {
  const match = { archived: false };

  if (query.jobId && mongoose.Types.ObjectId.isValid(query.jobId)) {
    match._id = buildObjectId(query.jobId);
  }

  return match;
};

const buildInterviewMatch = (query, upcomingOnly = false) => {
  const match = { deletedAt: null };

  if (query.jobId && mongoose.Types.ObjectId.isValid(query.jobId)) {
    match.jobId = buildObjectId(query.jobId);
  }

  if (upcomingOnly) {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    match.scheduledAt = { $gte: now, $lt: nextWeek };
    match.status = { $nin: ["Cancelled"] };
    return match;
  }

  const createdAtRange = buildCreatedAtRange(query.from, query.to);
  if (createdAtRange) {
    match.scheduledAt = createdAtRange;
  }

  return match;
};

const safePercent = (value) => (Number.isFinite(value) ? Number(value.toFixed(1)) : 0);

const getAnalyticsOverview = async (req, res) => {
  try {
    const candidateMatch = buildCandidateMatch(req.query);
    const jobMatch = buildJobMatch(req.query);
    const interviewMatch = buildInterviewMatch(req.query);
    const upcomingInterviewMatch = buildInterviewMatch(req.query, true);

    const [candidateSummary, jobSummary, totalInterviews, upcomingInterviews] = await Promise.all([
      Candidate.aggregate([
        { $match: candidateMatch },
        {
          $project: {
            stage: 1,
            reachedOffer: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$stageHistory",
                      as: "entry",
                      cond: { $eq: ["$$entry.stage", "Offer"] },
                    },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalCandidates: { $sum: 1 },
            hiredCandidates: {
              $sum: {
                $cond: [{ $eq: ["$stage", "Hired"] }, 1, 0],
              },
            },
            rejectedCandidates: {
              $sum: {
                $cond: [{ $eq: ["$stage", "Rejected"] }, 1, 0],
              },
            },
            offerPool: {
              $sum: {
                $cond: ["$reachedOffer", 1, 0],
              },
            },
          },
        },
      ]),
      Job.aggregate([
        { $match: jobMatch },
        {
          $group: {
            _id: null,
            totalJobs: { $sum: 1 },
            activeJobs: {
              $sum: {
                $cond: [{ $eq: ["$status", "open"] }, 1, 0],
              },
            },
            closedJobs: {
              $sum: {
                $cond: [{ $eq: ["$status", "closed"] }, 1, 0],
              },
            },
          },
        },
      ]),
      Interview.countDocuments(interviewMatch),
      Interview.countDocuments(upcomingInterviewMatch),
    ]);

    const candidateMetrics = candidateSummary[0] || {
      totalCandidates: 0,
      hiredCandidates: 0,
      rejectedCandidates: 0,
      offerPool: 0,
    };

    const jobMetrics = jobSummary[0] || {
      totalJobs: 0,
      activeJobs: 0,
      closedJobs: 0,
    };

    const offerAcceptanceRate =
      candidateMetrics.offerPool > 0
        ? safePercent((candidateMetrics.hiredCandidates / candidateMetrics.offerPool) * 100)
        : 0;

    return res.status(200).json({
      totalCandidates: candidateMetrics.totalCandidates,
      totalJobs: jobMetrics.totalJobs,
      activeJobs: jobMetrics.activeJobs,
      closedJobs: jobMetrics.closedJobs,
      totalInterviews,
      upcomingInterviews,
      hiredCandidates: candidateMetrics.hiredCandidates,
      rejectedCandidates: candidateMetrics.rejectedCandidates,
      offerAcceptanceRate,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPipelineAnalytics = async (req, res) => {
  try {
    const candidateMatch = buildCandidateMatch(req.query);
    const counts = await Candidate.aggregate([
      { $match: candidateMatch },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
        },
      },
    ]);

    const zeroed = {
      Applied: 0,
      Screening: 0,
      Interview: 0,
      Offer: 0,
      Hired: 0,
      Rejected: 0,
    };

    counts.forEach((item) => {
      zeroed[item._id] = item.count;
    });

    return res.status(200).json({
      items: Object.entries(zeroed).map(([stage, count]) => ({ stage, count })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getSourceAnalytics = async (req, res) => {
  try {
    const candidateMatch = buildCandidateMatch(req.query);
    const counts = await Candidate.aggregate([
      { $match: candidateMatch },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
    ]);

    const normalized = {
      Portal: 0,
      Referral: 0,
      Manual: 0,
      Other: 0,
    };

    counts.forEach((item) => {
      if (item._id === "portal") normalized.Portal += item.count;
      else if (item._id === "referral") normalized.Referral += item.count;
      else if (item._id === "manual") normalized.Manual += item.count;
      else normalized.Other += item.count;
    });

    return res.status(200).json({
      items: Object.entries(normalized).map(([source, value]) => ({ source, value })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getTimeToHireAnalytics = async (req, res) => {
  try {
    const candidateMatch = {
      ...buildCandidateMatch(req.query),
      stage: "Hired",
    };

    const items = await Candidate.aggregate([
      { $match: candidateMatch },
      {
        $project: {
          createdAt: 1,
          hiredEntry: {
            $first: {
              $filter: {
                input: "$stageHistory",
                as: "entry",
                cond: { $eq: ["$$entry.stage", "Hired"] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          hiredAt: "$hiredEntry.changedAt",
        },
      },
      {
        $match: {
          hiredAt: { $ne: null },
        },
      },
      {
        $addFields: {
          daysToHire: {
            $dateDiff: {
              startDate: "$createdAt",
              endDate: "$hiredAt",
              unit: "day",
            },
          },
          label: {
            $dateToString: {
              format: "%b %Y",
              date: "$hiredAt",
            },
          },
        },
      },
      {
        $group: {
          _id: "$label",
          avgDays: { $avg: "$daysToHire" },
          hires: { $sum: 1 },
          sortDate: { $min: "$hiredAt" },
        },
      },
      { $sort: { sortDate: 1 } },
    ]);

    const totalHires = items.reduce((sum, item) => sum + item.hires, 0);
    const avgDays =
      totalHires > 0
        ? safePercent(
            items.reduce((sum, item) => sum + item.avgDays * item.hires, 0) / totalHires
          )
        : 0;

    return res.status(200).json({
      avgDays,
      totalHires,
      items: items.map((item) => ({
        label: item._id,
        avgDays: safePercent(item.avgDays),
        hires: item.hires,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getInterviewAnalytics = async (req, res) => {
  try {
    const match = buildInterviewMatch(req.query, true);
    const [count, items] = await Promise.all([
      Interview.countDocuments(match),
      Interview.find(match)
        .populate("candidateId", "name")
        .populate("jobId", "title")
        .sort({ scheduledAt: 1 })
        .limit(8)
        .lean(),
    ]);

    return res.status(200).json({
      count,
      items: items.map((item) => ({
        id: item._id,
        candidateName: item.candidateId?.name || "Unknown candidate",
        jobTitle: item.jobId?.title || "Unknown job",
        scheduledAt: item.scheduledAt,
        round: item.round,
        mode: item.type,
        status: item.status,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAnalyticsOverview,
  getInterviewAnalytics,
  getPipelineAnalytics,
  getSourceAnalytics,
  getTimeToHireAnalytics,
};
