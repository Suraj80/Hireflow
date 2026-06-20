const https = require("https");
const WorkspaceSetting = require("../models/WorkspaceSetting");

const GOOGLE_TOKEN_HOST = "oauth2.googleapis.com";
const GOOGLE_TOKEN_PATH = "/token";
const GOOGLE_API_HOST = "www.googleapis.com";
const GRAPH_TOKEN_HOST = "login.microsoftonline.com";
const GRAPH_API_HOST = "graph.microsoft.com";

const CALENDAR_STATUS_MODES = {
  ACTIVE: "active",
  DISABLED: "disabled",
  NEEDS_CONFIG: "needs-config",
  NEEDS_CREDENTIALS: "needs-credentials",
};

const getGoogleCalendarConfig = () => ({
  clientId: String(process.env.GOOGLE_CALENDAR_CLIENT_ID || "").trim(),
  clientSecret: String(process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "").trim(),
  refreshToken: String(process.env.GOOGLE_CALENDAR_REFRESH_TOKEN || "").trim(),
  calendarId: String(process.env.GOOGLE_CALENDAR_ID || "").trim(),
});

const getOutlookCalendarConfig = () => ({
  tenantId: String(process.env.OUTLOOK_CALENDAR_TENANT_ID || "").trim(),
  clientId: String(process.env.OUTLOOK_CALENDAR_CLIENT_ID || "").trim(),
  clientSecret: String(process.env.OUTLOOK_CALENDAR_CLIENT_SECRET || "").trim(),
  userId: String(process.env.OUTLOOK_CALENDAR_USER_ID || "").trim(),
});

const getCalendarProviderConfig = (provider) => {
  if (provider === "google") {
    return getGoogleCalendarConfig();
  }

  if (provider === "outlook") {
    return getOutlookCalendarConfig();
  }

  return {};
};

const requestJson = async ({ hostname, path, method = "GET", headers = {} }, body = null) => {
  const payload = body
    ? typeof body === "string"
      ? body
      : JSON.stringify(body)
    : null;

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname,
        path,
        method,
        headers: {
          accept: "application/json",
          ...(payload ? { "content-length": Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (response) => {
        let raw = "";

        response.on("data", (chunk) => {
          raw += chunk;
        });

        response.on("end", () => {
          let parsed = null;

          if (raw) {
            try {
              parsed = JSON.parse(raw);
            } catch (_error) {
              parsed = null;
            }
          }

          const result = {
            statusCode: response.statusCode || 0,
            headers: response.headers,
            raw,
            data: parsed,
          };

          if (result.statusCode >= 200 && result.statusCode < 300) {
            resolve(result);
            return;
          }

          const errorMessage =
            parsed?.error_description ||
            parsed?.error?.message ||
            parsed?.message ||
            raw ||
            `Calendar request failed with status ${result.statusCode}`;

          const error = new Error(errorMessage);
          error.statusCode = result.statusCode;
          error.response = result;
          reject(error);
        });
      }
    );

    request.on("error", reject);

    if (payload) {
      request.write(payload);
    }

    request.end();
  });
};

const toCalendarSettings = (settings) => ({
  provider: settings?.provider || "none",
  enabled: settings?.enabled ?? false,
  organizerEmail: settings?.organizerEmail || "",
});

const buildProviderStatus = (provider, settings) => {
  const calendarSettings = toCalendarSettings(settings);
  const enabled = calendarSettings.enabled;
  const organizerEmail = calendarSettings.organizerEmail;

  if (!enabled || provider === "none") {
    return {
      provider: "none",
      enabled: false,
      configured: true,
      ready: false,
      mode: CALENDAR_STATUS_MODES.DISABLED,
      organizerEmail,
      message: "Calendar sync is turned off for this workspace.",
    };
  }

  const hasOrganizer = Boolean(organizerEmail);

  if (provider === "google") {
    const config = getGoogleCalendarConfig();
    const hasCredentials = Boolean(config.clientId && config.clientSecret && config.refreshToken);

    return {
      provider,
      enabled: true,
      configured: hasOrganizer,
      ready: hasOrganizer && hasCredentials,
      mode: hasOrganizer
        ? hasCredentials
          ? CALENDAR_STATUS_MODES.ACTIVE
          : CALENDAR_STATUS_MODES.NEEDS_CREDENTIALS
        : CALENDAR_STATUS_MODES.NEEDS_CONFIG,
      organizerEmail,
      message: !hasOrganizer
        ? "Add the organizer email to finish Google Calendar setup."
        : hasCredentials
          ? "Google Calendar sync is ready for live interview event updates."
          : "Add Google Calendar OAuth client credentials and refresh token on the server.",
    };
  }

  if (provider === "outlook") {
    const config = getOutlookCalendarConfig();
    const hasCredentials = Boolean(config.tenantId && config.clientId && config.clientSecret);

    return {
      provider,
      enabled: true,
      configured: hasOrganizer,
      ready: hasOrganizer && hasCredentials,
      mode: hasOrganizer
        ? hasCredentials
          ? CALENDAR_STATUS_MODES.ACTIVE
          : CALENDAR_STATUS_MODES.NEEDS_CREDENTIALS
        : CALENDAR_STATUS_MODES.NEEDS_CONFIG,
      organizerEmail,
      message: !hasOrganizer
        ? "Add the organizer email to finish Outlook Calendar setup."
        : hasCredentials
          ? "Outlook Calendar sync is ready for live interview event updates."
          : "Add Outlook tenant, client, and secret credentials on the server.",
    };
  }

  return {
    provider,
    enabled,
    configured: false,
    ready: false,
    mode: CALENDAR_STATUS_MODES.NEEDS_CONFIG,
    organizerEmail,
    message: "Unsupported calendar provider configuration.",
  };
};

const buildCalendarIntegrationStatus = (settings) =>
  buildProviderStatus(settings?.provider || "none", settings);

const getWorkspaceCalendarStatus = async () => {
  const settings = await WorkspaceSetting.findOne().select("integrations.calendar");
  return buildCalendarIntegrationStatus(settings?.integrations?.calendar);
};

const formatDateTimeForTimeZone = (value, timeZone) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(value));
  const read = (type) => parts.find((entry) => entry.type === type)?.value || "00";

  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}:${read("second")}`;
};

const getInterviewEnd = (interview) =>
  new Date(new Date(interview.scheduledAt).getTime() + Number(interview.duration || 0) * 60 * 1000);

const buildInterviewDescription = ({ interview, candidate, job, panelUsers = [], companyName = "HireFlow" }) => {
  const panelNames = panelUsers.map((user) => user?.name).filter(Boolean);

  return [
    `${companyName} interview scheduled from HireFlow.`,
    `Candidate: ${candidate?.name || "Candidate"}`,
    `Role: ${job?.title || interview.round || "Interview"}`,
    `Round: ${interview.round || "Interview"}`,
    `Type: ${interview.type || "Interview"}`,
    `Timezone: ${interview.timezone || "UTC"}`,
    interview.location ? `Location: ${interview.location}` : "",
    interview.meetLink ? `Meeting link: ${interview.meetLink}` : "",
    panelNames.length ? `Panel: ${panelNames.join(", ")}` : "",
    interview.agenda ? `Agenda: ${interview.agenda}` : "",
    interview.notes ? `Notes: ${interview.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const buildAttendees = ({ candidate, panelUsers = [] }) => {
  const unique = new Map();

  [candidate, ...panelUsers].forEach((person) => {
    const email = String(person?.email || "").trim().toLowerCase();
    if (!email || unique.has(email)) {
      return;
    }

    unique.set(email, {
      email,
      name: person?.name || "",
    });
  });

  return Array.from(unique.values());
};

const getGoogleAccessToken = async () => {
  const config = getGoogleCalendarConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: "refresh_token",
  }).toString();

  const response = await requestJson(
    {
      hostname: GOOGLE_TOKEN_HOST,
      path: GOOGLE_TOKEN_PATH,
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    },
    body
  );

  return response.data?.access_token || "";
};

const getOutlookAccessToken = async () => {
  const config = getOutlookCalendarConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  }).toString();

  const response = await requestJson(
    {
      hostname: GRAPH_TOKEN_HOST,
      path: `/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    },
    body
  );

  return response.data?.access_token || "";
};

const upsertGoogleEvent = async ({
  interview,
  candidate,
  job,
  panelUsers,
  organizerEmail,
  companyName,
  notifyAttendees,
}) => {
  const accessToken = await getGoogleAccessToken();
  const config = getGoogleCalendarConfig();
  const calendarId = config.calendarId || organizerEmail || "primary";
  const attendees = buildAttendees({ candidate, panelUsers });
  const end = getInterviewEnd(interview);
  const payload = {
    summary: `${candidate?.name || "Candidate"} - ${interview.round} Interview`,
    description: buildInterviewDescription({ interview, candidate, job, panelUsers, companyName }),
    location: interview.location || interview.meetLink || "",
    start: {
      dateTime: new Date(interview.scheduledAt).toISOString(),
      timeZone: interview.timezone || "UTC",
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: interview.timezone || "UTC",
    },
    attendees,
  };

  const eventId = interview.calendarSync?.provider === "google" ? interview.calendarSync?.eventId : "";
  const pathBase = `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const path = eventId ? `${pathBase}/${encodeURIComponent(eventId)}` : pathBase;
  const method = eventId ? "PUT" : "POST";
  const sendUpdates = notifyAttendees ? "all" : "none";
  const response = await requestJson(
    {
      hostname: GOOGLE_API_HOST,
      path: `${path}?sendUpdates=${sendUpdates}`,
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
    },
    payload
  );

  return {
    provider: "google",
    calendarId,
    eventId: response.data?.id || eventId,
    eventUrl: response.data?.htmlLink || "",
  };
};

const deleteGoogleEvent = async ({ eventId, calendarId, notifyAttendees }) => {
  if (!eventId) {
    return;
  }

  const accessToken = await getGoogleAccessToken();
  await requestJson({
    hostname: GOOGLE_API_HOST,
    path: `/calendar/v3/calendars/${encodeURIComponent(calendarId || "primary")}/events/${encodeURIComponent(eventId)}?sendUpdates=${
      notifyAttendees ? "all" : "none"
    }`,
    method: "DELETE",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
};

const buildOutlookAttendees = ({ candidate, panelUsers }) =>
  buildAttendees({ candidate, panelUsers }).map((attendee) => ({
    emailAddress: {
      address: attendee.email,
      name: attendee.name || attendee.email,
    },
    type: "required",
  }));

const upsertOutlookEvent = async ({
  interview,
  candidate,
  job,
  panelUsers,
  organizerEmail,
  companyName,
  notifyAttendees,
}) => {
  const accessToken = await getOutlookAccessToken();
  const config = getOutlookCalendarConfig();
  const userId = config.userId || organizerEmail;
  const eventId = interview.calendarSync?.provider === "outlook" ? interview.calendarSync?.eventId : "";
  const end = getInterviewEnd(interview);
  const payload = {
    subject: `${candidate?.name || "Candidate"} - ${interview.round} Interview`,
    body: {
      contentType: "text",
      content: buildInterviewDescription({ interview, candidate, job, panelUsers, companyName }),
    },
    start: {
      dateTime: formatDateTimeForTimeZone(interview.scheduledAt, interview.timezone),
      timeZone: interview.timezone || "UTC",
    },
    end: {
      dateTime: formatDateTimeForTimeZone(end, interview.timezone),
      timeZone: interview.timezone || "UTC",
    },
    location: {
      displayName: interview.location || interview.meetLink || "HireFlow interview",
    },
    attendees: buildOutlookAttendees({ candidate, panelUsers }),
    isReminderOn: true,
  };

  const basePath = `/v1.0/users/${encodeURIComponent(userId)}/events`;
  const method = eventId ? "PATCH" : "POST";
  const path = eventId ? `${basePath}/${encodeURIComponent(eventId)}` : basePath;
  const response = await requestJson(
    {
      hostname: GRAPH_API_HOST,
      path,
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        Prefer: notifyAttendees ? 'outlook.sendUpdates="all"' : 'outlook.sendUpdates="none"',
      },
    },
    payload
  );

  return {
    provider: "outlook",
    calendarId: userId,
    eventId: response.data?.id || eventId,
    eventUrl: response.data?.webLink || interview.calendarSync?.eventUrl || "",
  };
};

const deleteOutlookEvent = async ({ eventId, calendarId, notifyAttendees }) => {
  if (!eventId) {
    return;
  }

  const accessToken = await getOutlookAccessToken();
  await requestJson({
    hostname: GRAPH_API_HOST,
    path: `/v1.0/users/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    method: "DELETE",
    headers: {
      authorization: `Bearer ${accessToken}`,
      Prefer: notifyAttendees ? 'outlook.sendUpdates="all"' : 'outlook.sendUpdates="none"',
    },
  });
};

const markCalendarSyncState = async (interview, updates) => {
  interview.calendarSync = {
    provider: "none",
    eventId: "",
    calendarId: "",
    eventUrl: "",
    status: "disabled",
    lastSyncedAt: null,
    lastError: "",
    ...(interview.calendarSync?.toObject ? interview.calendarSync.toObject() : interview.calendarSync || {}),
    ...updates,
  };

  await interview.save();
};

const deleteSyncedEventForStoredProvider = async (interview, notifyAttendees = false) => {
  const syncState = interview.calendarSync?.toObject ? interview.calendarSync.toObject() : interview.calendarSync || {};

  if (!syncState.eventId || !syncState.provider || syncState.provider === "none") {
    return;
  }

  if (syncState.provider === "google") {
    await deleteGoogleEvent({
      eventId: syncState.eventId,
      calendarId: syncState.calendarId,
      notifyAttendees,
    });
    return;
  }

  if (syncState.provider === "outlook") {
    await deleteOutlookEvent({
      eventId: syncState.eventId,
      calendarId: syncState.calendarId,
      notifyAttendees,
    });
  }
};

const removeInterviewCalendarEvent = async ({ interview, notifyAttendees = Boolean(interview.sendInvite) } = {}) => {
  if (!interview) {
    return { skipped: true, reason: "missing-interview" };
  }

  if (!interview.calendarSync?.eventId) {
    await markCalendarSyncState(interview, {
      provider: interview.calendarSync?.provider || "none",
      status: "deleted",
      lastError: "",
      lastSyncedAt: new Date(),
    });
    return { skipped: true, reason: "no-event" };
  }

  try {
    await deleteSyncedEventForStoredProvider(interview, notifyAttendees);
    await markCalendarSyncState(interview, {
      provider: interview.calendarSync?.provider || "none",
      eventId: "",
      eventUrl: "",
      status: "deleted",
      lastError: "",
      lastSyncedAt: new Date(),
    });
    return { removed: true };
  } catch (error) {
    await markCalendarSyncState(interview, {
      status: "error",
      lastError: error.message,
      lastSyncedAt: new Date(),
    });
    console.error("[calendar] remove sync failed", error);
    return { removed: false, error: error.message };
  }
};

const syncInterviewCalendarEvent = async ({
  interview,
  candidate = null,
  job = null,
  panelUsers = [],
  notifyAttendees = Boolean(interview?.sendInvite),
} = {}) => {
  if (!interview) {
    return { skipped: true, reason: "missing-interview" };
  }

  const workspaceSettings = await WorkspaceSetting.findOne().select("integrations.calendar companyName");
  const calendarSettings = toCalendarSettings(workspaceSettings?.integrations?.calendar);
  const status = buildCalendarIntegrationStatus(calendarSettings);
  const hasProviderChanged =
    Boolean(interview.calendarSync?.eventId) &&
    Boolean(interview.calendarSync?.provider) &&
    interview.calendarSync.provider !== "none" &&
    interview.calendarSync.provider !== status.provider;

  if (interview.deletedAt || interview.status === "Cancelled") {
    return removeInterviewCalendarEvent({ interview, notifyAttendees });
  }

  if (!status.enabled || status.provider === "none") {
    await markCalendarSyncState(interview, {
      provider: "none",
      status: "disabled",
      lastError: "",
    });
    return { skipped: true, reason: "calendar-disabled" };
  }

  if (!status.ready) {
    await markCalendarSyncState(interview, {
      provider: status.provider,
      status: "error",
      lastError: status.message,
    });
    return { skipped: true, reason: "calendar-not-ready", message: status.message };
  }

  try {
    if (hasProviderChanged) {
      await deleteSyncedEventForStoredProvider(interview, false);
    }

    await markCalendarSyncState(interview, {
      provider: status.provider,
      eventId: hasProviderChanged ? "" : interview.calendarSync?.eventId || "",
      calendarId: hasProviderChanged ? "" : interview.calendarSync?.calendarId || "",
      eventUrl: hasProviderChanged ? "" : interview.calendarSync?.eventUrl || "",
      status: "pending",
      lastError: "",
    });

    const syncResult =
      status.provider === "google"
        ? await upsertGoogleEvent({
            interview,
            candidate,
            job,
            panelUsers,
            organizerEmail: calendarSettings.organizerEmail,
            companyName: workspaceSettings?.companyName || "HireFlow",
            notifyAttendees,
          })
        : await upsertOutlookEvent({
            interview,
            candidate,
            job,
            panelUsers,
            organizerEmail: calendarSettings.organizerEmail,
            companyName: workspaceSettings?.companyName || "HireFlow",
            notifyAttendees,
          });

    await markCalendarSyncState(interview, {
      provider: syncResult.provider,
      eventId: syncResult.eventId,
      calendarId: syncResult.calendarId,
      eventUrl: syncResult.eventUrl,
      status: "synced",
      lastError: "",
      lastSyncedAt: new Date(),
    });

    return { synced: true, provider: syncResult.provider, eventId: syncResult.eventId };
  } catch (error) {
    await markCalendarSyncState(interview, {
      provider: status.provider,
      status: "error",
      lastError: error.message,
      lastSyncedAt: new Date(),
    });
    console.error("[calendar] sync failed", error);
    return { synced: false, error: error.message };
  }
};

module.exports = {
  buildCalendarIntegrationStatus,
  getCalendarProviderConfig,
  getWorkspaceCalendarStatus,
  removeInterviewCalendarEvent,
  syncInterviewCalendarEvent,
};
