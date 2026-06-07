const https = require("https");
const WorkspaceSetting = require("../models/WorkspaceSetting");

const BREVO_HOSTNAME = "api.brevo.com";
const BREVO_PATH = "/v3/smtp/email";

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stripHtml = (value) => String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const formatDateTime = (value, timezone = "UTC") => {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone || "UTC",
  }).format(new Date(value));
};

const getEmailConfig = () => ({
  apiKey: String(process.env.BREVO_API_KEY || "").trim(),
  senderEmail: String(process.env.BREVO_SENDER_EMAIL || "").trim(),
  senderName: String(process.env.BREVO_SENDER_NAME || "HireFlow").trim(),
  replyToEmail: String(process.env.BREVO_REPLY_TO_EMAIL || "").trim(),
  sandboxMode: String(process.env.BREVO_SANDBOX_MODE || "").trim().toLowerCase() === "true",
});

const isEmailConfigured = () => {
  const config = getEmailConfig();
  return Boolean(config.apiKey && config.senderEmail);
};

const getWorkspaceEmailSettings = async () => {
  const settings = await WorkspaceSetting.findOne().select("notifications companyName");
  return {
    companyName: settings?.companyName || "HireFlow",
    notifications: {
      email: settings?.notifications?.email ?? true,
      interviewReminders: settings?.notifications?.interviewReminders ?? true,
      stageChanges: settings?.notifications?.stageChanges ?? true,
    },
  };
};

const sendTransactionalEmail = async ({
  to,
  subject,
  htmlContent,
  textContent,
  tags = [],
}) => {
  const config = getEmailConfig();

  if (!config.apiKey || !config.senderEmail) {
    return { skipped: true, reason: "email-not-configured" };
  }

  const recipients = (Array.isArray(to) ? to : [to]).filter((entry) => entry?.email);
  if (!recipients.length) {
    return { skipped: true, reason: "no-recipients" };
  }

  const payload = {
    sender: {
      email: config.senderEmail,
      name: config.senderName,
    },
    to: recipients.map((recipient) => ({
      email: recipient.email,
      ...(recipient.name ? { name: recipient.name } : {}),
    })),
    subject,
    htmlContent,
    textContent,
    tags,
  };

  if (config.replyToEmail) {
    payload.replyTo = {
      email: config.replyToEmail,
      name: config.senderName,
    };
  }

  if (config.sandboxMode) {
    payload.headers = {
      "X-Sib-Sandbox": "drop",
    };
  }

  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: BREVO_HOSTNAME,
        path: BREVO_PATH,
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": config.apiKey,
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
      },
      (response) => {
        let raw = "";

        response.on("data", (chunk) => {
          raw += chunk;
        });

        response.on("end", () => {
          const parsed = raw ? JSON.parse(raw) : {};

          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve(parsed);
            return;
          }

          reject(
            new Error(
              parsed?.message ||
                parsed?.code ||
                `Brevo request failed with status ${response.statusCode || "unknown"}`
            )
          );
        });
      }
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });
};

const safeSendTransactionalEmail = async (payload, context = "transactional-email") => {
  try {
    return await sendTransactionalEmail(payload);
  } catch (error) {
    console.error(`[email] ${context} failed`, error);
    return null;
  }
};

const buildStatusUrl = (candidate) => {
  if (!candidate?.statusToken) {
    return "";
  }

  const baseUrl = String(process.env.PUBLIC_CLIENT_URL || process.env.CLIENT_ORIGIN || "http://localhost:8080")
    .split(",")[0]
    .trim()
    .replace(/\/+$/g, "");

  return `${baseUrl}/status/${candidate.statusToken}`;
};

const sendCandidateStageChangeEmail = async ({
  candidate,
  job,
  previousStage,
  nextStage,
  reason = "",
}) => {
  const settings = await getWorkspaceEmailSettings();
  if (!settings.notifications.email || !settings.notifications.stageChanges || !candidate?.email) {
    return { skipped: true, reason: "stage-emails-disabled" };
  }

  const safeName = escapeHtml(candidate.name || "Candidate");
  const safeJobTitle = escapeHtml(job?.title || "your application");
  const safeNextStage = escapeHtml(nextStage);
  const safePreviousStage = escapeHtml(previousStage);
  const safeReason = escapeHtml(reason);
  const statusUrl = buildStatusUrl(candidate);

  const htmlContent = `
    <html>
      <body>
        <p>Hi ${safeName},</p>
        <p>Your application for <strong>${safeJobTitle}</strong> has moved from <strong>${safePreviousStage}</strong> to <strong>${safeNextStage}</strong>.</p>
        ${safeReason ? `<p>Update from the hiring team: ${safeReason}</p>` : ""}
        ${statusUrl ? `<p>You can review your current application status here: <a href="${statusUrl}">${statusUrl}</a></p>` : ""}
        <p>Best,<br />${escapeHtml(settings.companyName)}</p>
      </body>
    </html>
  `;

  const textContent = [
    `Hi ${candidate.name || "Candidate"},`,
    `Your application for ${job?.title || "your role"} has moved from ${previousStage} to ${nextStage}.`,
    reason ? `Update from the hiring team: ${reason}` : "",
    statusUrl ? `Track your application: ${statusUrl}` : "",
    `Best, ${settings.companyName}`,
  ]
    .filter(Boolean)
    .join("\n");

  return safeSendTransactionalEmail(
    {
      to: [{ email: candidate.email, name: candidate.name }],
      subject: `Application update: ${job?.title || "HireFlow"} -> ${nextStage}`,
      htmlContent,
      textContent,
      tags: ["candidate-stage-change"],
    },
    "candidate-stage-change-email"
  );
};

const buildInterviewEmailDetails = ({ interview, candidate, job }) => ({
  candidateName: candidate?.name || "Candidate",
  candidateEmail: candidate?.email || "",
  jobTitle: job?.title || interview?.round || "Interview",
  department: job?.department || "",
  round: interview?.round || "Interview",
  when: formatDateTime(interview?.scheduledAt, interview?.timezone),
  timezone: interview?.timezone || "UTC",
  location: interview?.location || "",
  meetLink: interview?.meetLink || "",
  agenda: stripHtml(interview?.agenda || ""),
  notes: stripHtml(interview?.notes || ""),
});

const sendInterviewInviteEmails = async ({ interview, candidate, job, panelUsers = [] }) => {
  const settings = await getWorkspaceEmailSettings();
  if (!settings.notifications.email || !settings.notifications.interviewReminders) {
    return { skipped: true, reason: "interview-emails-disabled" };
  }

  const details = buildInterviewEmailDetails({ interview, candidate, job });
  const safeCandidate = escapeHtml(details.candidateName);
  const safeJob = escapeHtml(details.jobTitle);
  const safeRound = escapeHtml(details.round);
  const safeWhen = escapeHtml(details.when);
  const safeTimezone = escapeHtml(details.timezone);
  const safeAgenda = escapeHtml(details.agenda);
  const safeMeetLink = escapeHtml(details.meetLink);
  const safeLocation = escapeHtml(details.location);

  const candidateHtml = `
    <html>
      <body>
        <p>Hi ${safeCandidate},</p>
        <p>Your <strong>${safeRound}</strong> interview for <strong>${safeJob}</strong> has been scheduled.</p>
        <p><strong>When:</strong> ${safeWhen} (${safeTimezone})</p>
        ${safeLocation ? `<p><strong>Location:</strong> ${safeLocation}</p>` : ""}
        ${safeMeetLink ? `<p><strong>Meeting link:</strong> <a href="${safeMeetLink}">${safeMeetLink}</a></p>` : ""}
        ${safeAgenda ? `<p><strong>Agenda:</strong> ${safeAgenda}</p>` : ""}
        <p>Best,<br />${escapeHtml(settings.companyName)}</p>
      </body>
    </html>
  `;

  const candidateText = [
    `Hi ${details.candidateName},`,
    `Your ${details.round} interview for ${details.jobTitle} has been scheduled.`,
    `When: ${details.when} (${details.timezone})`,
    details.location ? `Location: ${details.location}` : "",
    details.meetLink ? `Meeting link: ${details.meetLink}` : "",
    details.agenda ? `Agenda: ${details.agenda}` : "",
    `Best, ${settings.companyName}`,
  ]
    .filter(Boolean)
    .join("\n");

  const panelRecipients = panelUsers.filter((user) => user?.email);
  const panelHtml = `
    <html>
      <body>
        <p>Hello,</p>
        <p>You have been added to the <strong>${safeRound}</strong> interview panel for <strong>${safeCandidate}</strong>.</p>
        <p><strong>Role:</strong> ${safeJob}</p>
        <p><strong>When:</strong> ${safeWhen} (${safeTimezone})</p>
        ${safeLocation ? `<p><strong>Location:</strong> ${safeLocation}</p>` : ""}
        ${safeMeetLink ? `<p><strong>Meeting link:</strong> <a href="${safeMeetLink}">${safeMeetLink}</a></p>` : ""}
        ${safeAgenda ? `<p><strong>Agenda:</strong> ${safeAgenda}</p>` : ""}
        <p>Best,<br />${escapeHtml(settings.companyName)}</p>
      </body>
    </html>
  `;

  const panelText = [
    "Hello,",
    `You have been added to the ${details.round} interview panel for ${details.candidateName}.`,
    `Role: ${details.jobTitle}`,
    `When: ${details.when} (${details.timezone})`,
    details.location ? `Location: ${details.location}` : "",
    details.meetLink ? `Meeting link: ${details.meetLink}` : "",
    details.agenda ? `Agenda: ${details.agenda}` : "",
    `Best, ${settings.companyName}`,
  ]
    .filter(Boolean)
    .join("\n");

  const sends = [];

  if (details.candidateEmail) {
    sends.push(
      safeSendTransactionalEmail(
        {
          to: [{ email: details.candidateEmail, name: details.candidateName }],
          subject: `Interview scheduled: ${details.jobTitle} (${details.round})`,
          htmlContent: candidateHtml,
          textContent: candidateText,
          tags: ["interview-invite", "candidate"],
        },
        "interview-invite-candidate"
      )
    );
  }

  if (panelRecipients.length) {
    sends.push(
      safeSendTransactionalEmail(
        {
          to: panelRecipients.map((user) => ({ email: user.email, name: user.name })),
          subject: `Interview panel invite: ${details.candidateName} (${details.round})`,
          htmlContent: panelHtml,
          textContent: panelText,
          tags: ["interview-invite", "panel"],
        },
        "interview-invite-panel"
      )
    );
  }

  return Promise.all(sends);
};

const sendInterviewReminderEmails = async ({
  interview,
  candidate,
  job,
  panelUsers = [],
  kind = "reminder",
  reason = "",
}) => {
  const settings = await getWorkspaceEmailSettings();
  if (!settings.notifications.email || !settings.notifications.interviewReminders) {
    return { skipped: true, reason: "interview-emails-disabled" };
  }

  const details = buildInterviewEmailDetails({ interview, candidate, job });
  const safeCandidate = escapeHtml(details.candidateName);
  const safeJob = escapeHtml(details.jobTitle);
  const safeRound = escapeHtml(details.round);
  const safeWhen = escapeHtml(details.when);
  const safeTimezone = escapeHtml(details.timezone);
  const safeReason = escapeHtml(reason);
  const safeMeetLink = escapeHtml(details.meetLink);
  const safeLocation = escapeHtml(details.location);

  const subjectPrefix =
    kind === "rescheduled" ? "Interview rescheduled" : kind === "cancelled" ? "Interview cancelled" : "Interview reminder";

  const candidateIntro =
    kind === "rescheduled"
      ? `Your <strong>${safeRound}</strong> interview for <strong>${safeJob}</strong> has been rescheduled.`
      : kind === "cancelled"
        ? `Your <strong>${safeRound}</strong> interview for <strong>${safeJob}</strong> has been cancelled.`
        : `This is a reminder about your upcoming <strong>${safeRound}</strong> interview for <strong>${safeJob}</strong>.`;

  const candidateHtml = `
    <html>
      <body>
        <p>Hi ${safeCandidate},</p>
        <p>${candidateIntro}</p>
        <p><strong>When:</strong> ${safeWhen} (${safeTimezone})</p>
        ${safeLocation ? `<p><strong>Location:</strong> ${safeLocation}</p>` : ""}
        ${safeMeetLink ? `<p><strong>Meeting link:</strong> <a href="${safeMeetLink}">${safeMeetLink}</a></p>` : ""}
        ${safeReason ? `<p>${safeReason}</p>` : ""}
        <p>Best,<br />${escapeHtml(settings.companyName)}</p>
      </body>
    </html>
  `;

  const candidateText = [
    `Hi ${details.candidateName},`,
    kind === "rescheduled"
      ? `Your ${details.round} interview for ${details.jobTitle} has been rescheduled.`
      : kind === "cancelled"
        ? `Your ${details.round} interview for ${details.jobTitle} has been cancelled.`
        : `This is a reminder about your upcoming ${details.round} interview for ${details.jobTitle}.`,
    `When: ${details.when} (${details.timezone})`,
    details.location ? `Location: ${details.location}` : "",
    details.meetLink ? `Meeting link: ${details.meetLink}` : "",
    reason ? reason : "",
    `Best, ${settings.companyName}`,
  ]
    .filter(Boolean)
    .join("\n");

  const panelRecipients = panelUsers.filter((user) => user?.email);
  const panelHtml = `
    <html>
      <body>
        <p>Hello,</p>
        <p>${kind === "reminder" ? "This is a reminder for" : "Please note the update to"} the <strong>${safeRound}</strong> interview for <strong>${safeCandidate}</strong>.</p>
        <p><strong>Role:</strong> ${safeJob}</p>
        <p><strong>When:</strong> ${safeWhen} (${safeTimezone})</p>
        ${safeLocation ? `<p><strong>Location:</strong> ${safeLocation}</p>` : ""}
        ${safeMeetLink ? `<p><strong>Meeting link:</strong> <a href="${safeMeetLink}">${safeMeetLink}</a></p>` : ""}
        ${safeReason ? `<p>${safeReason}</p>` : ""}
        <p>Best,<br />${escapeHtml(settings.companyName)}</p>
      </body>
    </html>
  `;

  const panelText = [
    "Hello,",
    `${kind === "reminder" ? "This is a reminder for" : "Please note the update to"} the ${details.round} interview for ${details.candidateName}.`,
    `Role: ${details.jobTitle}`,
    `When: ${details.when} (${details.timezone})`,
    details.location ? `Location: ${details.location}` : "",
    details.meetLink ? `Meeting link: ${details.meetLink}` : "",
    reason ? reason : "",
    `Best, ${settings.companyName}`,
  ]
    .filter(Boolean)
    .join("\n");

  const sends = [];

  if (details.candidateEmail) {
    sends.push(
      safeSendTransactionalEmail(
        {
          to: [{ email: details.candidateEmail, name: details.candidateName }],
          subject: `${subjectPrefix}: ${details.jobTitle} (${details.round})`,
          htmlContent: candidateHtml,
          textContent: candidateText,
          tags: [`interview-${kind}`, "candidate"],
        },
        `interview-${kind}-candidate`
      )
    );
  }

  if (panelRecipients.length) {
    sends.push(
      safeSendTransactionalEmail(
        {
          to: panelRecipients.map((user) => ({ email: user.email, name: user.name })),
          subject: `${subjectPrefix}: ${details.candidateName} (${details.round})`,
          htmlContent: panelHtml,
          textContent: panelText,
          tags: [`interview-${kind}`, "panel"],
        },
        `interview-${kind}-panel`
      )
    );
  }

  return Promise.all(sends);
};

module.exports = {
  isEmailConfigured,
  sendCandidateStageChangeEmail,
  sendInterviewInviteEmails,
  sendInterviewReminderEmails,
  sendTransactionalEmail,
  safeSendTransactionalEmail,
};
