require("dotenv").config();

const connectDB = require("../src/config/db");
const User = require("../src/models/User");

const seedAdmin = async () => {
  const name = process.env.FIRST_ADMIN_NAME;
  const email = process.env.FIRST_ADMIN_EMAIL;
  const password = process.env.FIRST_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "FIRST_ADMIN_NAME, FIRST_ADMIN_EMAIL, and FIRST_ADMIN_PASSWORD must be set before running seed:admin."
    );
  }

  await connectDB();

  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) {
    console.log("Seed skipped: at least one user already exists.");
    process.exit(0);
  }

  const user = await User.create({
    name,
    email,
    password,
    role: "admin",
  });

  console.log(`Initial admin created: ${user.email}`);
  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error("Failed to seed initial admin:", error.message);
  process.exit(1);
});
