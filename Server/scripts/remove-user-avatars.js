require("dotenv").config();

const connectDB = require("../src/config/db");
const User = require("../src/models/User");

const removeUserAvatars = async () => {
  await connectDB();

  const result = await User.updateMany(
    { avatar: { $exists: true } },
    { $unset: { avatar: 1 } }
  );

  console.log(`Removed avatar field from ${result.modifiedCount} user record(s).`);
  process.exit(0);
};

removeUserAvatars().catch((error) => {
  console.error("Failed to remove avatar fields:", error.message);
  process.exit(1);
});
