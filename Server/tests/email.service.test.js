const test = require("node:test");
const assert = require("node:assert/strict");

const emailService = require("../src/services/email.service");

const ORIGINAL_ENV = { ...process.env };

const resetEnv = () => {
  process.env = { ...ORIGINAL_ENV };
};

test.afterEach(() => {
  resetEnv();
});

test("getEmailConfig reads Brevo env values", () => {
  process.env.BREVO_API_KEY = "test-api-key";
  process.env.BREVO_SENDER_EMAIL = "sender@example.com";
  process.env.BREVO_SENDER_NAME = "HireFlow QA";
  process.env.BREVO_REPLY_TO_EMAIL = "reply@example.com";
  process.env.BREVO_SANDBOX_MODE = "true";

  const config = emailService.getEmailConfig();

  assert.equal(config.apiKey, "test-api-key");
  assert.equal(config.senderEmail, "sender@example.com");
  assert.equal(config.senderName, "HireFlow QA");
  assert.equal(config.replyToEmail, "reply@example.com");
  assert.equal(config.sandboxMode, true);
});

test("buildEmailIntegrationStatus marks Brevo ready only when api key and sender exist", () => {
  const notReady = emailService.buildEmailIntegrationStatus({
    apiKey: "",
    senderEmail: "",
    senderName: "HireFlow",
    replyToEmail: "",
    sandboxMode: false,
  });

  assert.equal(notReady.provider, "brevo");
  assert.equal(notReady.configured, false);
  assert.equal(notReady.ready, false);
  assert.equal(notReady.hasApiKey, false);

  const ready = emailService.buildEmailIntegrationStatus({
    apiKey: "key",
    senderEmail: "sender@example.com",
    senderName: "HireFlow",
    replyToEmail: "reply@example.com",
    sandboxMode: true,
  });

  assert.equal(ready.configured, true);
  assert.equal(ready.ready, true);
  assert.equal(ready.sandboxMode, true);
  assert.equal(ready.senderEmail, "sender@example.com");
  assert.equal(ready.replyToEmail, "reply@example.com");
});

test("sendTransactionalEmail skips cleanly when Brevo is not configured", async () => {
  delete process.env.BREVO_API_KEY;
  delete process.env.BREVO_SENDER_EMAIL;

  const result = await emailService.sendTransactionalEmail({
    to: [{ email: "candidate@example.com", name: "Candidate" }],
    subject: "Test",
    htmlContent: "<p>Hello</p>",
    textContent: "Hello",
  });

  assert.deepEqual(result, {
    skipped: true,
    reason: "email-not-configured",
  });
});
