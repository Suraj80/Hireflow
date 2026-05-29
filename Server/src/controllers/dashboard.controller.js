const mongoose = require("mongoose");
const Candidate = require("../models/Candidate");
const Job = require("../models/Job");
const Interview = require("../models/Interview");

const asObjectId = (value) => new mongoose.Types.ObjectId(value);

const buildDashboardFilters = (user) => {
  if (!user) {
    return {
      candidateMatch: { archived: false },
      jobMatch: { archived: false },
      interviewMatch: { deletedAt: null },
    };
  }

  if (user.role === "recruiter") {
    return {
      candidateMatch: {
        archived: false,
        $or: [{ recruiterAssigned: asObjectId(user.id) }, { createdBy: asObjectId(user.id) }],
      },
      jobMatch: {
        archived: false,
        createdBy: asObjectId(user.id),
      },
      interviewMatch: {
        deletedAt: null,
        $or: [{ recruiterId: asObjectId(user.id) }, { createdBy: asObjectId(user.id) }],
      },
    };
  }

  return {
    candidateMatch: { archived: false },
    jobMatch: { archived: false },
    interviewMatch: { deletedAt: null },
  };
};

const getThisMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
};

const getNextWeekRange = () => {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
};

const getDashboardOverview = async (req, res) => {
  try {
    const { candidateMatch, jobMatch, interviewMatch } = buildDashboardFilters(req.user);
    const { start: monthStart, end: monthEnd } = getThisMonthRange();
    const { start: nextWeekStart, end: nextWeekEnd } = getNextWeekRange();

    const candidateSummaryPromise = Candidate.aggregate([
      { $match: candidateMatch },
      {
        $group: {
          _id: null,
          totalCandidates: { $sum: 1 },
          pendingApplications: {
            $sum: {
              $cond: [{ $eq: ["$stage", "Applied"] }, 1, 0],
            },
          },
          candidatesInInterview: {
            $sum: {
              $cond: [{ $eq: ["$stage", "Interview"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const hiredThisMonthPromise = Candidate.aggregate([
      { $match: candidateMatch },
      {
        $project: {
          hiredEntries: {
            $filter: {
              input: "$stageHistory",
              as: "entry",
              cond: {
                $and: [
                  { $eq: ["$$entry.stage", "Hired"] },
                  { $gte: ["$$entry.changedAt", monthStart] },
                  { $lt: ["$$entry.changedAt", monthEnd] },
                ],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          hiredThisMonth: {
            $sum: {
              $cond: [{ $gt: [{ $size: "$hiredEntries" }, 0] }, 1, 0],
            },
          },
        },
      },
    ]);

    const jobsSummaryPromise = Job.aggregate([
      { $match: jobMatch },
      {
        $group: {
          _id: null,
          activeJobs: { $sum: 1 },
          openJobs: {
            $sum: {
              $cond: [{ $eq: ["$status", "open"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const activeJobsListPromise = Job.aggregate([
      {
        $match: {
          ...jobMatch,
          status: { $in: ["open", "draft"] },
        },
      },
      {
        $lookup: {
          from: "candidates",
          let: { jobId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$jobId", "$$jobId"] },
                archived: false,
              },
            },
            { $count: "count" },
          ],
          as: "applicantMetrics",
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          department: 1,
          deadline: 1,
          status: 1,
          applicantsCount: {
            $ifNull: [{ $arrayElemAt: ["$applicantMetrics.count", 0] }, 0],
          },
        },
      },
      { $sort: { status: 1, createdAt: -1 } },
      { $limit: 6 },
    ]);

    const recentCandidatesPromise = Candidate.find(candidateMatch)
      .populate("jobId", "title department")
      .sort({ createdAt: -1 })
      .limit(6)
      .select("name stage aiScore email phone createdAt jobId");

    const pipelineSummaryPromise = Candidate.aggregate([
      { $match: candidateMatch },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
        },
      },
    ]);

    const upcomingInterviewsPromise = Interview.find({
      ...interviewMatch,
      scheduledAt: { $gte: nextWeekStart, $lt: nextWeekEnd },
      status: { $nin: ["Cancelled"] },
    })
      .populate("candidateId", "name")
      .populate("jobId", "title")
      .sort({ scheduledAt: 1 })
      .limit(6)
      .select("candidateId jobId scheduledAt round type status");

    const upcomingInterviewsCountPromise = Interview.countDocuments({
      ...interviewMatch,
      scheduledAt: { $gte: nextWeekStart, $lt: nextWeekEnd },
      status: { $nin: ["Cancelled"] },
    });

    const recentStageActivityPromise = Candidate.aggregate([
      { $match: candidateMatch },
      { $unwind: "$stageHistory" },
      { $sort: { "stageHistory.changedAt": -1 } },
      { $limit: 8 },
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "job",
        },
      },
      {
        $project: {
          type: { $literal: "candidate-stage-changed" },
          title: {
            $concat: ["Moved to ", "$stageHistory.stage"],
          },
          description: {
            $concat: ["$name", " for ", { $ifNull: [{ $arrayElemAt: ["$job.title", 0] }, "Unknown job"] }],
          },
          createdAt: "$stageHistory.changedAt",
        },
      },
    ]);

    const recentCandidateActivityPromise = Candidate.find(candidateMatch)
      .populate("jobId", "title")
      .sort({ createdAt: -1 })
      .limit(4)
      .select("name createdAt jobId");

    const recentInterviewActivityPromise = Interview.find(interviewMatch)
      .populate("candidateId", "name")
      .populate("jobId", "title")
      .sort({ createdAt: -1 })
      .limit(4)
      .select("candidateId jobId createdAt round");

    const recentJobActivityPromise = Job.find(jobMatch)
      .sort({ createdAt: -1 })
      .limit(4)
      .select("title status createdAt");

    const [
      candidateSummary,
      hiredThisMonthSummary,
      jobsSummary,
      activeJobsList,
      recentCandidates,
      pipelineSummary,
      upcomingInterviews,
      upcomingInterviewsCount,
      recentStageActivity,
      recentCandidateActivity,
      recentInterviewActivity,
      recentJobActivity,
    ] = await Promise.all([
      candidateSummaryPromise,
      hiredThisMonthPromise,
      jobsSummaryPromise,
      activeJobsListPromise,
      recentCandidatesPromise,
      pipelineSummaryPromise,
      upcomingInterviewsPromise,
      upcomingInterviewsCountPromise,
      recentStageActivityPromise,
      recentCandidateActivityPromise,
      recentInterviewActivityPromise,
      recentJobActivityPromise,
    ]);

    const summary = candidateSummary[0] || {
      totalCandidates: 0,
      pendingApplications: 0,
      candidatesInInterview: 0,
    };

    const hiredSummary = hiredThisMonthSummary[0] || { hiredThisMonth: 0 };
    const jobs = jobsSummary[0] || { activeJobs: 0, openJobs: 0 };

    const stageOrder = ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"];
    const pipelineMap = Object.fromEntries(stageOrder.map((stage) => [stage, 0]));
    pipelineSummary.forEach((item) => {
      pipelineMap[item._id] = item.count;
    });

    const recentActivity = [
      ...recentStageActivity,
      ...recentCandidateActivity.map((item) => ({
        type: "candidate-applied",
        title: "New application",
        description: `${item.name} applied for ${item.jobId?.title || "Unknown job"}`,
        createdAt: item.createdAt,
      })),
      ...recentInterviewActivity.map((item) => ({
        type: "interview-scheduled",
        title: "Interview scheduled",
        description: `${item.candidateId?.name || "Unknown candidate"} for ${item.jobId?.title || "Unknown job"}`,
        createdAt: item.createdAt,
      })),
      ...recentJobActivity.map((item) => ({
        type: "job-updated",
        title: item.status === "closed" ? "Job closed" : "Job created",
        description: item.title,
        createdAt: item.createdAt,
      })),
    ]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 8);

    return res.status(200).json({
      totalCandidates: summary.totalCandidates,
      activeJobs: jobs.activeJobs,
      openJobs: jobs.openJobs,
      upcomingInterviewsCount,
      candidatesInInterview: summary.candidatesInInterview,
      pendingApplications: summary.pendingApplications,
      hiredThisMonth: hiredSummary.hiredThisMonth,
      recentCandidates: recentCandidates.map((item) => ({
        id: item._id,
        name: item.name,
        jobTitle: item.jobId?.title || "Unknown job",
        appliedAt: item.createdAt,
        stage: item.stage,
        aiScore: item.aiScore,
        email: item.email,
        phone: item.phone,
      })),
      upcomingInterviews: upcomingInterviews.map((item) => ({
        id: item._id,
        candidateName: item.candidateId?.name || "Unknown candidate",
        jobTitle: item.jobId?.title || "Unknown job",
        scheduledAt: item.scheduledAt,
        round: item.round,
        mode: item.type,
        status: item.status,
      })),
      activeJobsList: activeJobsList.map((item) => ({
        id: item._id,
        title: item.title,
        department: item.department,
        applicantsCount: item.applicantsCount,
        deadline: item.deadline,
        status: item.status,
      })),
      pipelineSummary: stageOrder.map((stage) => ({
        stage,
        count: pipelineMap[stage] || 0,
      })),
      recentActivity: recentActivity.map((item, index) => ({
        id: `${item.type}-${index}-${item.createdAt}`,
        type: item.type,
        title: item.title,
        description: item.description,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardOverview,
};
