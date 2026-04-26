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

const issueSession = async (res, user, rotatedFrom = null) => {
  const tokenId = generateTokenId();
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, tokenId);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiryDate(),
    rotatedFrom,
  });

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

  return accessToken;
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password });
    const accessToken = await issueSession(res, user);

    return res.status(201).json({
      message: "User registered successfully",
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = await issueSession(res, user);

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const refresh = async (req, res) => {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    if (!token) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (error) {
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getRefreshCookieOptions());
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
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getRefreshCookieOptions());
      return res.status(401).json({ message: "Refresh token expired or revoked" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      await RefreshToken.findByIdAndUpdate(existingToken._id, { revokedAt: new Date() });
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getRefreshCookieOptions());
      return res.status(401).json({ message: "User not found" });
    }

    await RefreshToken.findByIdAndUpdate(existingToken._id, { revokedAt: new Date() });
    const accessToken = await issueSession(res, user, existingToken._id);

    return res.status(200).json({ accessToken });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    if (token) {
      await RefreshToken.findOneAndUpdate(
        { tokenHash: hashToken(token), revokedAt: null },
        { revokedAt: new Date() }
      );
    }

    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getRefreshCookieOptions());
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

    return res.status(200).json(sanitizeUser(user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
};
