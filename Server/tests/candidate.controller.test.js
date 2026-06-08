const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createQuery,
  createResponse,
  createSpy,
  loadModuleWithMocks,
} = require("./helpers/controller-test-utils");

const controllerPath = path.join(__dirname, "../src/controllers/candidate.controller.js");

test("updateCandidateStage moves the candidate and triggers notification/email side effects", async () => {
  const candidateId = "507f1f77bcf86cd799439011";
  const jobId = "507f1f77bcf86cd799439012";
  const recruiterId = "507f1f77bcf86cd799439013";

  const stageDocument = {
    _id: candidateId,
    name: "Avery Candidate",
    email: "avery@example.com",
    phone: "",
    altPhone: "",
    location: "Remote",
    linkedin: "",
    portfolio: "",
    currentCompany: "",
    currentRole: "",
    jobId,
    department: "Engineering",
    source: "LinkedIn",
    referredBy: "",
    expectedSalary: null,
    noticePeriod: "",
    workAuthorization: "",
    resumeUrl: "",
    resumeMeta: null,
    coverLetter: "",
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    languages: [],
    recruiterAssigned: recruiterId,
    stage: "Applied",
    priority: "Medium",
    rating: null,
    aiScore: null,
    aiReasoning: "",
    aiStatus: "not-started",
    aiError: "",
    aiScoredAt: null,
    archived: false,
    status: "Active",
    statusToken: "status-token",
    createdBy: recruiterId,
    updatedBy: recruiterId,
    createdAt: new Date("2026-06-01T10:00:00Z"),
    updatedAt: new Date("2026-06-01T10:00:00Z"),
    stageHistory: [],
    interviews: [],
    activityLog: [],
    notesCount: 0,
    save: async () => stageDocument,
  };

  const hydratedCandidate = {
    ...stageDocument,
    jobId: {
      _id: jobId,
      title: "Frontend Engineer",
      department: "Engineering",
      location: "Remote",
    },
    recruiterAssigned: {
      _id: recruiterId,
      name: "Riley Recruiter",
      email: "riley@example.com",
      role: "recruiter",
    },
    createdBy: {
      _id: recruiterId,
      name: "Riley Recruiter",
      email: "riley@example.com",
      role: "recruiter",
    },
    updatedBy: {
      _id: recruiterId,
      name: "Riley Recruiter",
      email: "riley@example.com",
      role: "recruiter",
    },
    toObject() {
      return {
        ...this,
        stage: stageDocument.stage,
        status: stageDocument.status,
        stageHistory: [...this.stageHistory],
        interviews: [...this.interviews],
        activityLog: [...this.activityLog],
      };
    },
  };

  const notifyCandidateStageChange = createSpy(async () => undefined);
  const sendCandidateStageChangeEmail = createSpy(async () => undefined);
  const createAuditLog = createSpy(async () => undefined);

  let candidateFindByIdCalls = 0;

  const Candidate = {
    findById: createSpy(() => {
      candidateFindByIdCalls += 1;
      return candidateFindByIdCalls === 1
        ? Promise.resolve(stageDocument)
        : createQuery(hydratedCandidate);
    }),
  };

  const Job = {
    findById: createSpy(() =>
      createQuery({
        _id: jobId,
        title: "Frontend Engineer",
        department: "Engineering",
        location: "Remote",
      })
    ),
  };

  const CandidateNote = {
    find: createSpy(() => createQuery([])),
  };

  const { loaded, restore } = loadModuleWithMocks(controllerPath, {
    "../models/Candidate": Candidate,
    "../models/CandidateNote": CandidateNote,
    "../models/Job": Job,
    "../models/User": {},
    "../services/audit.service": { createAuditLog },
    "../services/email.service": { sendCandidateStageChangeEmail },
    "../services/notification.service": {
      notifyCandidateStageChange,
      notifyNewApplication: createSpy(async () => undefined),
    },
    "../services/resumeScoring.service": {
      queueCandidateResumeScoring: createSpy(async () => undefined),
    },
  });

  try {
    const req = {
      params: { id: candidateId },
      body: {
        stage: "Interview",
        reason: "Strong screening call",
      },
      user: {
        id: recruiterId,
        name: "Riley Recruiter",
        role: "recruiter",
      },
    };
    const res = createResponse();

    await loaded.updateCandidateStage(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(stageDocument.stage, "Interview");
    assert.equal(stageDocument.status, "Active");
    assert.equal(stageDocument.stageHistory[0].stage, "Interview");
    assert.equal(stageDocument.activityLog[0].meta.previousStage, "Applied");

    assert.equal(createAuditLog.calls.length, 1);
    assert.equal(notifyCandidateStageChange.calls.length, 1);
    assert.equal(sendCandidateStageChangeEmail.calls.length, 1);

    assert.equal(notifyCandidateStageChange.calls[0][0].previousStage, "Applied");
    assert.equal(notifyCandidateStageChange.calls[0][0].nextStage, "Interview");
    assert.equal(sendCandidateStageChangeEmail.calls[0][0].job.title, "Frontend Engineer");
    assert.equal(res.body.stage, "Interview");
  } finally {
    restore();
  }
});
