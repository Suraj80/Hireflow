require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");
const { startAutoCloseJobSweep } = require("./src/services/job-auto-close.service");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  startAutoCloseJobSweep();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
