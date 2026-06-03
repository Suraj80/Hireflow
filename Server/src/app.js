const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const jobRoutes = require("./routes/job.routes");
const candidateRoutes = require("./routes/candidate.routes");
const interviewRoutes = require("./routes/interview.routes");
const userRoutes = require("./routes/user.routes");
const departmentRoutes = require("./routes/department.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:8080")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({ message: "Hireflow API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/dashboard", dashboardRoutes);

module.exports = app;
