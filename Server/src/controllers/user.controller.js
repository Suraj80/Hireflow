const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { sanitizeUser } = require("../utils/auth");

const ALLOWED_ROLES = ["admin", "recruiter", "viewer"];

const buildUserResponse = (user) => ({
  ...sanitizeUser(user),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  status: user.isActive === false ? "inactive" : "active",
});

const buildUserOption = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
});

const buildValidationError = (message, field = null) => ({
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
});

const listUsers = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const role = String(req.query.role || "all").trim().toLowerCase();
    const query = {};

    if (role !== "all") {
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json(buildValidationError("Invalid role filter", "role"));
      }

      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      items: users.map(buildUserResponse),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const listUserOptions = async (_req, res) => {
  try {
    const users = await User.find({}).sort({ name: 1, email: 1 });

    return res.status(200).json({
      items: users.map(buildUserOption),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const role = String(req.body.role || "viewer").trim().toLowerCase();

    if (!name) {
      return res.status(400).json(buildValidationError("Name is required", "name"));
    }

    if (!email) {
      return res.status(400).json(buildValidationError("Email is required", "email"));
    }

    if (!password || password.length < 6) {
      return res.status(400).json(buildValidationError("Password must be at least 6 characters", "password"));
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json(buildValidationError("Invalid role", "role"));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json(buildValidationError("A user with this email already exists", "email"));
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    return res.status(201).json({
      message: "User created successfully",
      user: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = String(req.body.role || "").trim().toLowerCase();

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (req.user.id === id && role !== "admin") {
      return res.status(400).json({ message: "You cannot remove your own admin access" });
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User role updated successfully",
      user: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const revokeUserSessions = async (userId) => {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date() }
  );
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const isActive = req.body.isActive;

    if (typeof isActive !== "boolean") {
      return res.status(400).json(buildValidationError("isActive must be a boolean", "isActive"));
    }

    if (req.user.id === id && isActive === false) {
      return res.status(400).json({ message: "You cannot deactivate your own account" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isActive = isActive;
    await user.save();

    if (!isActive) {
      await revokeUserSessions(user._id);
    }

    return res.status(200).json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const password = String(req.body.password || "");

    if (!password || password.length < 6) {
      return res.status(400).json(buildValidationError("Password must be at least 6 characters", "password"));
    }

    const user = await User.findById(id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = password;
    await user.save();
    await revokeUserSessions(user._id);

    return res.status(200).json({
      message: "User password updated successfully",
      user: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await revokeUserSessions(user._id);
    await User.findByIdAndDelete(id);

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createUser,
  deleteUser,
  listUsers,
  listUserOptions,
  updateRole,
  updatePassword,
  updateStatus,
};
