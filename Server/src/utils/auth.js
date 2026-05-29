const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

const parseDurationToMs = (value, fallbackMs) => {
  if (!value || typeof value !== "string") return fallbackMs;

  const match = value.trim().match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || "",
  createdAt: user.createdAt,
});

const signAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

const signRefreshToken = (user, tokenId) =>
  jwt.sign({ id: user._id, role: user.role, tokenId }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_TOKEN_SECRET);

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const generateTokenId = () => crypto.randomBytes(32).toString("hex");

const getRefreshTokenExpiryDate = () =>
  new Date(Date.now() + parseDurationToMs(REFRESH_TOKEN_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000));

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: "lax",
  path: "/api/auth",
  maxAge: parseDurationToMs(REFRESH_TOKEN_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000),
});

module.exports = {
  ACCESS_TOKEN_EXPIRES_IN,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_SECRET,
  generateTokenId,
  getRefreshCookieOptions,
  getRefreshTokenExpiryDate,
  hashToken,
  sanitizeUser,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
};
