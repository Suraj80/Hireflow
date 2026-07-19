const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const {
  REFRESH_TOKEN_COOKIE_NAME,
  generateTokenId,
  getRefreshCookieOptions,
  getRefreshTokenExpiryDate,
  hashToken,
  sanitizeUser,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/auth");
const { createAuditLog } = require("../services/audit.service");
const {
  getSecuritySettings,
  validatePasswordAgainstPolicy,
} = require("../services/workspace-settings.service");

const issueSession = async (res, user, securitySettings, rotatedFrom = null) => {
  const tokenId = generateTokenId();
  const accessToken = signAccessToken(user, securitySettings);
  const refreshToken = signRefreshToken(user, tokenId, securitySettings);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiryDate(securitySettings),
    rotatedFrom,
  });

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshCookieOptions(securitySettings));

  return accessToken;
};

const isDemoLoginEnabled = () => {
  if (process.env.DEMO_LOGIN_ENABLED === "false") return false;
  if (process.env.DEMO_LOGIN_ENABLED === "true") return true;
  return process.env.NODE_ENV !== "production";
};

const getDemoUserCredentials = (role) => {
  const roleLabel = role === "admin" ? "admin" : "recruiter";
  const upperRole = roleLabel.toUpperCase();

  return {
    name: roleLabel === "admin" ? "HireFlow Admin" : "HireFlow Recruiter",
    email:
      process.env[`DEMO_${upperRole}_EMAIL`] || `${roleLabel}@hireflow.local`,
    password:
      process.env[`DEMO_${upperRole}_PASSWORD`] ||
      (roleLabel === "admin" ? "HireFlowAdmin!2026" : "HireFlowRecruiter!2026"),
  };
};

const ensureDemoUser = async (role, securitySettings) => {
  const existingUser = await User.findOne({ role, isActive: { $ne: false } }).sort({ createdAt: 1 });
  if (existingUser) {
    return existingUser;
  }

  const credentials = getDemoUserCredentials(role);
  const passwordPolicyError = validatePasswordAgainstPolicy(credentials.password, securitySettings);
  if (passwordPolicyError) {
    throw new Error(passwordPolicyError);
  }

  const createdUser = await User.create({
    name: credentials.name,
    email: credentials.email,
    password: credentials.password,
    role,
    lastLoginAt: new Date(),
  });

  return createdUser;
};

const finalizeLogin = async (req, res, user, securitySettings, description, meta = {}) => {
  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = await issueSession(res, user, securitySettings);

  await createAuditLog({
    req,
    actor: user,
    action: "login",
    category: "security",
    entity: {
      type: "auth",
      id: user._id,
      label: user.email,
    },
    description,
    meta: {
      lastLoginAt: user.lastLoginAt,
      ...meta,
    },
  });

  return res.status(200).json({
    message: "Login successful",
    accessToken,
    user: sanitizeUser(user),
  });
};

const register = async (req, res) => {
  try {
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      return res.status(403).json({
        message: "Public registration is disabled. Contact your administrator.",
      });
    }

    const { name, email, password } = req.body;
    const securitySettings = await getSecuritySettings();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const passwordPolicyError = validatePasswordAgainstPolicy(password, securitySettings);
    if (passwordPolicyError) {
      return res.status(400).json({ message: passwordPolicyError });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: "admin",
      lastLoginAt: new Date(),
    });
    const accessToken = await issueSession(res, user, securitySettings);

    await createAuditLog({
      req,
      actor: user,
      action: "created",
      category: "security",
      entity: {
        type: "auth",
        id: user._id,
        label: user.email,
      },
      description: `Bootstrapped initial administrator ${user.email}`,
      meta: {
        role: user.role,
      },
    });

    return res.status(201).json({
      message: "Initial administrator created successfully",
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyValue?.email) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    return res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const securitySettings = await getSecuritySettings();

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "This account has been deactivated. Contact your administrator." });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return finalizeLogin(req, res, user, securitySettings, `Signed in as ${user.email}`);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const quickLogin = async (req, res, role, description, meta = {}) => {
  try {
    if (!isDemoLoginEnabled()) {
      return res.status(403).json({ message: "Demo login is disabled." });
    }

    const securitySettings = await getSecuritySettings();
    const user = await ensureDemoUser(role, securitySettings);

    return finalizeLogin(req, res, user, securitySettings, description, {
      demoLogin: true,
      role: user.role,
      ...meta,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const adminLogin = async (req, res) => {
  return quickLogin(req, res, "admin", "Signed in as admin using quick access", { loginType: "admin" });
};

const recruiterLogin = async (req, res) => {
  return quickLogin(req, res, "recruiter", "Signed in as recruiter using quick access", { loginType: "recruiter" });
};

const demoLogin = async (req, res) => {
  const { role } = req.body || {};

  if (role === "admin") {
    return adminLogin(req, res);
  }

  if (role === "recruiter") {
    return recruiterLogin(req, res);
  }

  return res.status(400).json({ message: "Role must be admin or recruiter." });
};

const refresh = async (req, res) => {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    const securitySettings = await getSecuritySettings();

    if (!token) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (error) {
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getRefreshCookieOptions(securitySettings));
      return res.status(401).json({ message: "Refresh token invalid" });
    }

    const tokenHash = hashToken(token);
    const existingToken = await RefreshToken.findOne({
      userId: decoded.id,
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!existingToken) {
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getRefreshCookieOptions(securitySettings));
      return res.status(401).json({ message: "Refresh token expired or revoked" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      await RefreshToken.findByIdAndUpdate(existingToken._id, { revokedAt: new Date() });
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getRefreshCookieOptions(securitySettings));
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isActive === false) {
      await RefreshToken.findByIdAndUpdate(existingToken._id, { revokedAt: new Date() });
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getRefreshCookieOptions(securitySettings));
      return res.status(403).json({ message: "This account has been deactivated. Contact your administrator." });
    }

    await RefreshToken.findByIdAndUpdate(existingToken._id, { revokedAt: new Date() });
    const accessToken = await issueSession(res, user, securitySettings, existingToken._id);

    return res.status(200).json({ accessToken });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    const securitySettings = await getSecuritySettings();
    const actor = req.user
      ? {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        }
      : null;

    if (token) {
      await RefreshToken.findOneAndUpdate(
        { tokenHash: hashToken(token), revokedAt: null },
        { revokedAt: new Date() }
      );
    }

    if (actor) {
      await createAuditLog({
        req,
        actor,
        action: "logout",
        category: "security",
        entity: {
          type: "auth",
          id: actor.id,
          label: actor.email,
        },
        description: `Signed out ${actor.email}`,
      });
    }

    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getRefreshCookieOptions(securitySettings));
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "This account has been deactivated. Contact your administrator." });
    }

    return res.status(200).json(sanitizeUser(user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+password");
    const securitySettings = await getSecuritySettings();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "This account has been deactivated. Contact your administrator." });
    }

    const previousEmail = user.email;
    const nextName = typeof req.body.name === "string" ? req.body.name.trim() : user.name;
    const nextEmail =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : previousEmail;
    const currentPassword = typeof req.body.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";

    if (!nextName) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (!nextEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (nextEmail !== previousEmail) {
      const existingUser = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(409).json({ message: "A user with this email already exists" });
      }
    }

    user.name = nextName;
    user.email = nextEmail;

    if (newPassword) {
      const passwordPolicyError = validatePasswordAgainstPolicy(newPassword, securitySettings);
      if (passwordPolicyError) {
        return res.status(400).json({ message: passwordPolicyError });
      }

      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to change password" });
      }

      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      user.password = newPassword;
    }

    await user.save();

    await createAuditLog({
      req,
      actor: user,
      action: "profile-updated",
      category: "security",
      entity: {
        type: "user",
        id: user._id,
        label: user.email,
      },
      description: `Updated profile for ${user.email}`,
      meta: {
        emailChanged: nextEmail !== previousEmail,
        passwordChanged: Boolean(newPassword),
      },
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  adminLogin,
  recruiterLogin,
  demoLogin,
  refresh,
  logout,
  me,
  updateMe,
};
