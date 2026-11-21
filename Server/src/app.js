const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const jobRoutes = require("./routes/job.routes");
const candidateRoutes = require("./routes/candidate.routes");
const interviewRoutes = require("./routes/interview.routes");
const userRoutes = require("./routes/user.routes");
const departmentRoutes = require("./routes/department.routes");
const settingsRoutes = require("./routes/settings.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const auditRoutes = require("./routes/audit.routes");
const notificationRoutes = require("./routes/notification.routes");
const offerRoutes = require("./routes/offer.routes");
const { publicErrorMessage, sendError } = require("./utils/api-response");

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:8080")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, _res, next) => {
  req.requestId = req.headers["x-request-id"] || `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  next();
});
app.use(helmet());
app.use(compression());
app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", {
    skip: (req) => req.path === "/" && req.method === "GET",
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      sendError(res, 429, req, {
        code: "RATE_LIMITED",
        message: "Too many requests, please try again later.",
      });
    },
  })
);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (_req, res) => {
  res.status(200).json({ message: "Hireflow API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/offers", offerRoutes);

app.use((req, res) => {
  sendError(res, 404, req, {
    code: "NOT_FOUND",
    message: "Route not found",
  });
});

app.use((error, req, res, _next) => {
  const statusCode = Number(error?.statusCode || error?.status) || 500;

  if (res.headersSent) {
    return _next(error);
  }

  sendError(res, statusCode, req, {
    code: error?.code || (statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED"),
    message: statusCode >= 500 ? publicErrorMessage(error) : error?.message || "Request failed",
    errors: error?.errors,
  });
});

module.exports = app;
