const VALIDATION_FAILED_MESSAGE = "Validation failed";

/**
 * Minimal REST error payload. HTTP status remains the source of truth for success/failure.
 */
const buildValidationError = (issuesOrMessage, field = null) => {
  if (typeof issuesOrMessage === "string") {
    const message = issuesOrMessage;
    return {
      code: "VALIDATION_ERROR",
      message,
      ...(field
        ? {
            errors: [
              {
                field,
                message,
              },
            ],
          }
        : {}),
    };
  }

  const issues = issuesOrMessage || [];
  return {
    code: "VALIDATION_ERROR",
    message: VALIDATION_FAILED_MESSAGE,
    errors: issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  };
};

const attachRequestId = (req, body) => ({
  ...body,
  ...(req?.requestId ? { requestId: req.requestId } : {}),
});

const sendError = (res, statusCode, req, { message, code, errors }) => {
  const payload = { message };

  if (code) {
    payload.code = code;
  }

  if (errors?.length) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(attachRequestId(req, payload));
};

const sendJson = (res, statusCode, req, body) => res.status(statusCode).json(attachRequestId(req, body));

const publicErrorMessage = (error) => {
  if (process.env.NODE_ENV === "production") {
    return "Internal server error";
  }

  return error?.message || "Internal server error";
};

module.exports = {
  buildValidationError,
  publicErrorMessage,
  sendError,
  sendJson,
};