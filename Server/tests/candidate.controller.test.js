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
    "../services/resumeImport.service": {
      extractResumeTextFromFile: createSpy(async () => ""),
      parseResumeCandidateData: createSpy(() => null),
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

test("checkDuplicateCandidate returns a normalized duplicate when the candidate already exists for the job", async () => {
  const candidateId = "507f1f77bcf86cd799439101";
  const jobId = "507f1f77bcf86cd799439102";
  const recruiterId = "507f1f77bcf86cd799439103";

  const duplicateCandidate = {
    _id: candidateId,
    name: "Duplicate Candidate",
    email: "duplicate@example.com",
    phone: "",
    altPhone: "",
    location: "Remote",
    linkedin: "",
    portfolio: "",
    currentCompany: "",
    currentRole: "",
    jobId: {
      _id: jobId,
      title: "Frontend Engineer",
      department: "Engineering",
      location: "Remote",
    },
    department: "Engineering",
    source: "manual",
    referredBy: "",
    expectedSalary: null,
    noticePeriod: "",
    workAuthorization: "",
    resumeUrl: "",
    resumeMeta: {
      filename: "",
      size: 0,
      mimeType: "",
    },
    coverLetter: "",
    skills: [],
    experience: {
      years: 0,
      months: 0,
    },
    education: [],
    certifications: [],
    languages: [],
    recruiterAssigned: {
      _id: recruiterId,
      name: "Riley Recruiter",
      email: "riley@example.com",
      role: "recruiter",
    },
    stage: "Screening",
    priority: "Medium",
    rating: null,
    aiScore: null,
    aiReasoning: "",
    aiStatus: "not-started",
    aiError: "",
    aiScoredAt: null,
    notesCount: 0,
    archived: false,
    status: "Active",
    statusToken: "duplicate-status-token",
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
    createdAt: new Date("2026-06-01T10:00:00Z"),
    updatedAt: new Date("2026-06-02T10:00:00Z"),
    stageHistory: [],
    interviews: [],
    activityLog: [],
    toObject() {
      return {
        ...this,
        stageHistory: [],
        interviews: [],
        activityLog: [],
      };
    },
  };

  const { loaded, restore } = loadModuleWithMocks(controllerPath, {
    "../models/Candidate": {
      findOne: createSpy(() => createQuery(duplicateCandidate)),
    },
    "../models/CandidateNote": {
      find: createSpy(() => createQuery([])),
    },
    "../models/Job": {},
    "../models/User": {},
    "../services/audit.service": { createAuditLog: createSpy(async () => undefined) },
    "../services/email.service": { sendCandidateStageChangeEmail: createSpy(async () => undefined) },
    "../services/notification.service": {
      notifyCandidateStageChange: createSpy(async () => undefined),
      notifyNewApplication: createSpy(async () => undefined),
    },
    "../services/resumeScoring.service": {
      queueCandidateResumeScoring: createSpy(async () => undefined),
    },
    "../services/resumeImport.service": {
      extractResumeTextFromFile: createSpy(async () => ""),
      parseResumeCandidateData: createSpy(() => null),
    },
  });

  try {
    const req = {
      query: {
        email: "duplicate@example.com",
        jobId,
      },
      user: {
        id: recruiterId,
        role: "recruiter",
      },
    };
    const res = createResponse();

    await loaded.checkDuplicateCandidate(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.duplicate.id, candidateId);
    assert.equal(res.body.duplicate.email, "duplicate@example.com");
    assert.equal(res.body.duplicate.stage, "Screening");
  } finally {
    restore();
  }
});

test("applyToJobPublic creates a candidate, queues AI scoring, and triggers new application notifications", async () => {
  const jobId = "507f1f77bcf86cd799439111";
  const creatorId = "507f1f77bcf86cd799439112";
  const createdCandidateId = "507f1f77bcf86cd799439113";

  const queueCandidateResumeScoring = createSpy(async () => undefined);
  const notifyNewApplication = createSpy(async () => undefined);
  const createAuditLog = createSpy(async () => undefined);

  const jobDocument = {
    _id: jobId,
    title: "Backend Engineer",
    department: "Platform",
    status: "open",
    visibility: "public",
    archived: false,
    createdBy: {
      _id: creatorId,
      name: "Riley Recruiter",
      email: "riley@example.com",
      role: "recruiter",
    },
  };

  const createdCandidate = {
    _id: createdCandidateId,
    id: createdCandidateId,
    name: "Avery Jordan",
    email: "avery@example.com",
    resumeUrl: "http://localhost:5000/uploads/resumes/avery.pdf",
    statusToken: "public-status-token",
  };

  const { loaded, restore } = loadModuleWithMocks(controllerPath, {
    "../models/Candidate": {
      findOne: createSpy(() => createQuery(null)),
      create: createSpy(async () => createdCandidate),
    },
    "../models/CandidateNote": {
      find: createSpy(() => createQuery([])),
    },
    "../models/Job": {
      findById: createSpy(() => createQuery(jobDocument)),
    },
    "../models/User": {},
    "../services/audit.service": { createAuditLog },
    "../services/email.service": { sendCandidateStageChangeEmail: createSpy(async () => undefined) },
    "../services/notification.service": {
      notifyCandidateStageChange: createSpy(async () => undefined),
      notifyNewApplication,
    },
    "../services/resumeScoring.service": {
      queueCandidateResumeScoring,
    },
    "../services/resumeImport.service": {
      extractResumeTextFromFile: createSpy(async () => ""),
      parseResumeCandidateData: createSpy(() => null),
    },
  });

  try {
    const req = {
      params: { jobId },
      body: {
        firstName: "Avery",
        lastName: "Jordan",
        email: "avery@example.com",
        phone: "+1 555 111 2222",
        linkedin: "https://linkedin.com/in/avery",
        coverLetter: "Excited to apply.",
      },
      file: {
        originalname: "avery.pdf",
        mimetype: "application/pdf",
        size: 120000,
        filename: "avery-uploaded.pdf",
        path: "D:\\fake\\avery.pdf",
      },
      protocol: "http",
      get: createSpy(() => "localhost:5000"),
    };
    const res = createResponse();

    await loaded.applyToJobPublic(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.jobTitle, "Backend Engineer");
    assert.equal(queueCandidateResumeScoring.calls.length, 1);
    assert.equal(queueCandidateResumeScoring.calls[0][0], createdCandidateId);
    assert.equal(notifyNewApplication.calls.length, 1);
    assert.equal(notifyNewApplication.calls[0][0].candidate.name, "Avery Jordan");
    assert.equal(createAuditLog.calls.length, 1);
  } finally {
    restore();
  }
});
