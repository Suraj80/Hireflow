const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createQuery,
  createResponse,
  createSpy,
  loadModuleWithMocks,
} = require("./helpers/controller-test-utils");

const controllerPath = path.join(__dirname, "../src/controllers/interview.controller.js");

test("createInterview schedules an interview, moves the candidate stage, and sends invite triggers", async () => {
  const candidateId = "507f1f77bcf86cd799439021";
  const jobId = "507f1f77bcf86cd799439022";
  const interviewerId = "507f1f77bcf86cd799439023";
  const recruiterId = "507f1f77bcf86cd799439024";
  const interviewId = "507f1f77bcf86cd799439025";

  const candidateDocument = {
    _id: candidateId,
    name: "Jamie Candidate",
    email: "jamie@example.com",
    stage: "Screening",
    jobId: {
      toString: () => jobId,
    },
    recruiterAssigned: recruiterId,
    archived: false,
    stageHistory: [],
    activityLog: [],
    save: async () => candidateDocument,
  };

  const jobDocument = {
    _id: jobId,
    title: "Backend Engineer",
    department: "Platform",
    location: "Remote",
    archived: false,
  };

  const interviewerDocument = {
    _id: interviewerId,
    name: "Morgan Interviewer",
    email: "morgan@example.com",
    role: "recruiter",
  };

  const interviewDocument = {
    _id: interviewId,
    candidateId,
    jobId,
    round: "Technical Round",
    type: "Video",
    status: "Scheduled",
    scheduledAt: new Date("2026-06-15T10:30:00Z"),
    duration: 60,
    timezone: "Asia/Kolkata",
    location: "",
    meetLink: "https://meet.example.com/room",
    interviewers: [interviewerId],
    leadInterviewer: interviewerId,
    recruiterId,
    agenda: "System design discussion",
    notes: "",
    reminderSettings: [1440, 60],
    sendInvite: true,
    feedback: [],
    notifications: [],
    auditTrail: [],
    createdBy: recruiterId,
    updatedBy: recruiterId,
    deletedAt: null,
    cancelledReason: "",
    save: async () => interviewDocument,
  };

  const hydratedInterview = {
    ...interviewDocument,
    candidateId: {
      _id: candidateId,
      name: candidateDocument.name,
      email: candidateDocument.email,
      stage: "Interview",
      jobId,
    },
    jobId: {
      _id: jobId,
      title: jobDocument.title,
      department: jobDocument.department,
      location: jobDocument.location,
    },
    interviewers: [interviewerDocument],
    leadInterviewer: interviewerDocument,
    recruiterId: {
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
  };

  const notifyCandidateStageChange = createSpy(async () => undefined);
  const notifyInterviewEvent = createSpy(async () => undefined);
  const sendCandidateStageChangeEmail = createSpy(async () => undefined);
  const sendInterviewInviteEmails = createSpy(async () => undefined);
  const createAuditLog = createSpy(async () => undefined);

  const Interview = {
    create: createSpy(async () => interviewDocument),
    find: createSpy(() => createQuery([])),
    findById: createSpy(() => createQuery(hydratedInterview)),
  };

  const { loaded, restore } = loadModuleWithMocks(controllerPath, {
    "../models/Candidate": {
      findById: createSpy(() => createQuery(candidateDocument)),
    },
    "../models/Interview": Interview,
    "../models/Job": {
      findById: createSpy(() => createQuery(jobDocument)),
    },
    "../models/User": {
      find: createSpy(() => createQuery([interviewerDocument])),
    },
    "../services/audit.service": { createAuditLog },
    "../services/email.service": {
      sendCandidateStageChangeEmail,
      sendInterviewInviteEmails,
      sendInterviewReminderEmails: createSpy(async () => undefined),
    },
    "../services/notification.service": {
      notifyCandidateStageChange,
      notifyInterviewEvent,
    },
  });

  try {
    const req = {
      body: {
        candidateId,
        jobId,
        round: "Technical Round",
        type: "Video",
        status: "Scheduled",
        date: "2026-06-15",
        time: "10:30",
        timezone: "Asia/Kolkata",
        duration: 60,
        interviewers: [interviewerId],
        leadInterviewer: interviewerId,
        agenda: "System design discussion",
        notes: "",
        meetingLink: "https://meet.example.com/room",
        location: "",
        reminderSettings: [1440, 60],
        sendInvite: true,
      },
      user: {
        id: recruiterId,
        role: "recruiter",
      },
    };
    const res = createResponse();

    await loaded.createInterview(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(candidateDocument.stage, "Interview");
    assert.equal(candidateDocument.stageHistory[0].reason, "Interview scheduled");
    assert.equal(interviewDocument.notifications[0].type, "invite");

    assert.equal(createAuditLog.calls.length, 1);
    assert.equal(notifyCandidateStageChange.calls.length, 1);
    assert.equal(sendCandidateStageChangeEmail.calls.length, 1);
    assert.equal(notifyInterviewEvent.calls.length, 1);
    assert.equal(sendInterviewInviteEmails.calls.length, 1);

    assert.equal(sendInterviewInviteEmails.calls[0][0].candidate.name, "Jamie Candidate");
    assert.equal(res.body.round, "Technical Round");
    assert.equal(res.body.permissions.canSendReminder, true);
  } finally {
    restore();
  }
});

test("updateInterviewStatus only triggers notification and reminder emails when requested", async () => {
  const candidateId = "507f1f77bcf86cd799439031";
  const jobId = "507f1f77bcf86cd799439032";
  const interviewerId = "507f1f77bcf86cd799439033";
  const recruiterId = "507f1f77bcf86cd799439034";
  const interviewId = "507f1f77bcf86cd799439035";

  const interviewDocument = {
    _id: interviewId,
    candidateId,
    jobId,
    round: "Manager Round",
    type: "Video",
    status: "Scheduled",
    scheduledAt: new Date("2026-06-16T08:30:00Z"),
    duration: 45,
    timezone: "Asia/Kolkata",
    location: "",
    meetLink: "",
    interviewers: [interviewerId],
    leadInterviewer: interviewerId,
    recruiterId,
    agenda: "",
    notes: "",
    reminderSettings: [60],
    sendInvite: true,
    feedback: [],
    notifications: [],
    auditTrail: [],
    createdBy: recruiterId,
    updatedBy: recruiterId,
    deletedAt: null,
    cancelledReason: "",
    save: async () => interviewDocument,
  };

  const hydratedInterview = {
    ...interviewDocument,
    status: "Cancelled",
    interviewers: [
      {
        _id: interviewerId,
        name: "Morgan Interviewer",
        email: "morgan@example.com",
        role: "recruiter",
      },
    ],
    leadInterviewer: {
      _id: interviewerId,
      name: "Morgan Interviewer",
      email: "morgan@example.com",
      role: "recruiter",
    },
    candidateId: {
      _id: candidateId,
      name: "Jordan Candidate",
      email: "jordan@example.com",
      stage: "Interview",
      jobId,
    },
    jobId: {
      _id: jobId,
      title: "Product Designer",
      department: "Design",
      location: "Remote",
    },
    recruiterId: {
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
  };

  let interviewFindByIdCalls = 0;
  const notifyInterviewEvent = createSpy(async () => undefined);
  const sendInterviewReminderEmails = createSpy(async () => undefined);

  const { loaded, restore } = loadModuleWithMocks(controllerPath, {
    "../models/Candidate": {
      findById: createSpy(() =>
        createQuery({
          _id: candidateId,
          name: "Jordan Candidate",
          email: "jordan@example.com",
          stage: "Interview",
          jobId,
        })
      ),
    },
    "../models/Interview": {
      findById: createSpy(() => {
        interviewFindByIdCalls += 1;
        return interviewFindByIdCalls === 1
          ? Promise.resolve(interviewDocument)
          : createQuery(hydratedInterview);
      }),
    },
    "../models/Job": {
      findById: createSpy(() =>
        createQuery({
          _id: jobId,
          title: "Product Designer",
          department: "Design",
          location: "Remote",
        })
      ),
    },
    "../models/User": {
      find: createSpy(() =>
        createQuery([
          {
            _id: interviewerId,
            name: "Morgan Interviewer",
            email: "morgan@example.com",
            role: "recruiter",
          },
        ])
      ),
    },
    "../services/audit.service": {
      createAuditLog: createSpy(async () => undefined),
    },
    "../services/email.service": {
      sendCandidateStageChangeEmail: createSpy(async () => undefined),
      sendInterviewInviteEmails: createSpy(async () => undefined),
      sendInterviewReminderEmails,
    },
    "../services/notification.service": {
      notifyCandidateStageChange: createSpy(async () => undefined),
      notifyInterviewEvent,
    },
  });

  try {
    const resWithTriggers = createResponse();
    await loaded.updateInterviewStatus(
      {
        params: { id: interviewId },
        body: {
          status: "Cancelled",
          reason: "Candidate requested a later slot",
          sendNotification: true,
        },
        user: {
          id: recruiterId,
          role: "recruiter",
        },
      },
      resWithTriggers
    );

    assert.equal(resWithTriggers.statusCode, 200);
    assert.equal(notifyInterviewEvent.calls.length, 1);
    assert.equal(sendInterviewReminderEmails.calls.length, 1);
    assert.equal(sendInterviewReminderEmails.calls[0][0].kind, "cancelled");

    const resWithoutTriggers = createResponse();
    await loaded.updateInterviewStatus(
      {
        params: { id: interviewId },
        body: {
          status: "Completed",
          reason: "Panel finished the interview",
          sendNotification: false,
        },
        user: {
          id: recruiterId,
          role: "recruiter",
        },
      },
      resWithoutTriggers
    );

    assert.equal(resWithoutTriggers.statusCode, 200);
    assert.equal(notifyInterviewEvent.calls.length, 1);
    assert.equal(sendInterviewReminderEmails.calls.length, 1);
  } finally {
    restore();
  }
});
