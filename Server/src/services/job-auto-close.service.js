const Job = require("../models/Job");
const { createAuditLog } = require("./audit.service");

const AUTO_CLOSE_INTERVAL_MS = 5 * 60 * 1000;

const closeExpiredJobs = async () => {
  const now = new Date();

  const jobsToClose = await Job.find({
    archived: false,
    status: "open",
    autoClose: true,
    deadline: { $ne: null, $lte: now },
  })
    .select("_id title deadline updatedBy")
    .lean();

  if (!jobsToClose.length) {
    return { closedCount: 0 };
  }

  await Job.updateMany(
    { _id: { $in: jobsToClose.map((job) => job._id) } },
    {
      $set: {
        status: "closed",
        updatedAt: now,
      },
    }
  );

  await Promise.all(
    jobsToClose.map((job) =>
      createAuditLog({
        actor: {
          id: null,
          name: "System",
          email: "",
          role: "system",
        },
        action: "auto_closed",
        category: "jobs",
        entity: {
          type: "job",
          id: job._id,
          label: job.title,
        },
        description: `Auto-closed job ${job.title} after the deadline passed`,
        meta: {
          deadline: job.deadline,
          status: "closed",
          reason: "deadline_passed",
          autoClose: true,
        },
      })
    )
  );

  return { closedCount: jobsToClose.length };
};

const startAutoCloseJobSweep = () => {
  const runSweep = async () => {
    try {
      const result = await closeExpiredJobs();

      if (result.closedCount > 0) {
        console.log(`[jobs] Auto-closed ${result.closedCount} overdue job(s)`);
      }
    } catch (error) {
      console.error("[jobs] Auto-close sweep failed:", error.message);
    }
  };

  void runSweep();

  const intervalId = setInterval(() => {
    void runSweep();
  }, AUTO_CLOSE_INTERVAL_MS);

  if (typeof intervalId.unref === "function") {
    intervalId.unref();
  }

  return intervalId;
};

module.exports = {
  AUTO_CLOSE_INTERVAL_MS,
  closeExpiredJobs,
  startAutoCloseJobSweep,
};
