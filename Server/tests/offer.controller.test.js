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
