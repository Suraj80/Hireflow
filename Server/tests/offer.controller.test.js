const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createQuery,
  createResponse,
  createSpy,
  loadModuleWithMocks,
} = require("./helpers/controller-test-utils");

const controllerPath = path.join(__dirname, "../src/controllers/offer.controller.js");

test("updateOfferStatus accepts an offer, syncs the candidate to hired, and emits follow-up signals", async () => {
  const offerId = "507f1f77bcf86cd799439041";
  const candidateId = "507f1f77bcf86cd799439042";
  const jobId = "507f1f77bcf86cd799439043";
  const recruiterId = "507f1f77bcf86cd799439044";

  const offerDocument = {
    _id: offerId,
    candidateId,
    jobId,
    title: "Senior Backend Engineer",
    salaryAmount: 2800000,
    bonusAmount: 200000,
    equity: "",
    currency: "INR",
    startDate: new Date("2026-07-01T00:00:00Z"),
    expiresAt: new Date("2026-06-30T00:00:00Z"),
    letterHtml: "<p>Offer letter</p>",
    notes: "",
    status: "Sent",
    version: 1,
    versions: [],
    publicToken: "offer-token",
    sentAt: new Date("2026-06-08T09:00:00Z"),
    respondedAt: null,
    withdrawnAt: null,
    decisionName: "",
    decisionMessage: "",
    createdBy: recruiterId,
    updatedBy: recruiterId,
    createdAt: new Date("2026-06-08T09:00:00Z"),
    updatedAt: new Date("2026-06-08T09:00:00Z"),
    deletedAt: null,
    save: async () => offerDocument,
  };

  const candidateDocument = {
    _id: candidateId,
    name: "Taylor Candidate",
    email: "taylor@example.com",
    stage: "Offer",
    archived: false,
    status: "Active",
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
    jobId,
    stageHistory: [],
    activityLog: [],
    save: async () => candidateDocument,
  };

  const hydratedOffer = {
    ...offerDocument,
    get status() {
      return offerDocument.status;
    },
    get respondedAt() {
      return offerDocument.respondedAt;
    },
    candidateId: {
      _id: candidateId,
      name: candidateDocument.name,
      email: candidateDocument.email,
      stage: "Hired",
      recruiterAssigned: candidateDocument.recruiterAssigned,
    },
    jobId: {
      _id: jobId,
      title: "Senior Backend Engineer",
      department: "Platform",
      location: "Remote",
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
    versions: [],
  };

  const createAuditLog = createSpy(async () => undefined);
  const notifyCandidateStageChange = createSpy(async () => undefined);
  const notifyOfferEvent = createSpy(async () => undefined);
  const sendCandidateStageChangeEmail = createSpy(async () => undefined);

  let offerFindByIdCalls = 0;

  const { loaded, restore } = loadModuleWithMocks(controllerPath, {
    "../models/Candidate": {
      findById: createSpy(() => createQuery(candidateDocument)),
    },
    "../models/Job": {
      findById: createSpy(() =>
        createQuery({
          _id: jobId,
          title: "Senior Backend Engineer",
          department: "Platform",
          location: "Remote",
        })
      ),
    },
    "../models/WorkspaceSetting": {
      findOne: createSpy(() => createQuery(null)),
    },
    "../models/Offer": {
      Offer: {
        findOne: createSpy(() => Promise.resolve(offerDocument)),
        findById: createSpy(() => {
          offerFindByIdCalls += 1;
          return createQuery(hydratedOffer);
        }),
        updateMany: createSpy(async () => ({ modifiedCount: 0 })),
      },
      offerStatusOptions: ["Draft", "Sent", "Accepted", "Declined", "Withdrawn", "Expired"],
    },
    "../services/audit.service": { createAuditLog },
    "../services/email.service": { sendCandidateStageChangeEmail },
    "../services/notification.service": {
      notifyCandidateStageChange,
      notifyOfferEvent,
    },
  });

  try {
    const req = {
      params: { id: offerId },
      body: {
        status: "Accepted",
        message: "Candidate signed the offer.",
      },
      user: {
        id: recruiterId,
        name: "Riley Recruiter",
        role: "recruiter",
      },
    };
    const res = createResponse();

    await loaded.updateOfferStatus(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(offerDocument.status, "Accepted");
    assert.ok(offerDocument.respondedAt instanceof Date);
    assert.equal(candidateDocument.stage, "Hired");
    assert.equal(candidateDocument.status, "Hired");
    assert.equal(candidateDocument.stageHistory[0].stage, "Hired");

    assert.equal(createAuditLog.calls.length, 1);
    assert.equal(notifyCandidateStageChange.calls.length, 1);
    assert.equal(sendCandidateStageChangeEmail.calls.length, 1);
    assert.equal(notifyOfferEvent.calls.length, 1);
    assert.equal(notifyOfferEvent.calls[0][0].type, "offer-accepted");
    assert.equal(res.body.status, "Accepted");
  } finally {
    restore();
  }
});

test("downloadOfferPdf streams a generated PDF for an active offer", async () => {
  const offerId = "507f1f77bcf86cd799439051";
  const candidateId = "507f1f77bcf86cd799439052";
  const jobId = "507f1f77bcf86cd799439053";
  const recruiterId = "507f1f77bcf86cd799439054";

  const offerDocument = {
    _id: offerId,
    candidateId: {
      _id: candidateId,
      name: "Morgan Candidate",
      email: "morgan@example.com",
    },
    jobId: {
      _id: jobId,
      title: "Staff Product Designer",
      department: "Design",
      location: "Remote",
    },
    title: "Staff Product Designer",
    salaryAmount: 180000,
    bonusAmount: 15000,
    equity: "0.2%",
    currency: "USD",
    startDate: new Date("2026-08-01T00:00:00Z"),
    expiresAt: new Date("2026-06-30T00:00:00Z"),
    letterHtml: "<p>Welcome aboard</p>",
    notes: "Internal note",
    status: "Sent",
    version: 3,
    deletedAt: null,
  };

  const streamOfferPdf = createSpy(async () => undefined);
  const createAuditLog = createSpy(async () => undefined);

  const { loaded, restore } = loadModuleWithMocks(controllerPath, {
    "../models/Candidate": {
      findById: createSpy(() => createQuery(null)),
    },
    "../models/Job": {
      findById: createSpy(() => createQuery(null)),
    },
    "../models/WorkspaceSetting": {
      findOne: createSpy(() =>
        createQuery({
          companyName: "HireFlow Labs",
        })
      ),
    },
    "../models/Offer": {
      Offer: {
        findOne: createSpy(() => createQuery(offerDocument)),
        updateMany: createSpy(async () => ({ modifiedCount: 0 })),
      },
      offerStatusOptions: ["Draft", "Sent", "Accepted", "Declined", "Withdrawn", "Expired"],
    },
    "../services/audit.service": { createAuditLog },
    "../services/email.service": { sendCandidateStageChangeEmail: createSpy(async () => undefined) },
    "../services/notification.service": {
      notifyCandidateStageChange: createSpy(async () => undefined),
      notifyOfferEvent: createSpy(async () => undefined),
    },
    "../services/offer-pdf.service": {
      streamOfferPdf,
    },
  });

  try {
    const req = {
      params: { id: offerId },
      user: {
        id: recruiterId,
        name: "Riley Recruiter",
        role: "recruiter",
      },
    };
    const res = {
      headersSent: false,
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };

    await loaded.downloadOfferPdf(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(streamOfferPdf.calls.length, 1);
    assert.equal(streamOfferPdf.calls[0][0], res);
    assert.equal(streamOfferPdf.calls[0][1].candidateName, "Morgan Candidate");
    assert.equal(streamOfferPdf.calls[0][1].companyName, "HireFlow Labs");
    assert.equal(streamOfferPdf.calls[0][1].version, 3);
    assert.equal(createAuditLog.calls.length, 1);
    assert.equal(createAuditLog.calls[0][0].action, "offer-pdf-downloaded");
  } finally {
    restore();
  }
});
