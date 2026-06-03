const jwt = require("jsonwebtoken");
const { ACCESS_TOKEN_SECRET } = require("../utils/auth");
const User = require("../models/User");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded.id).select("_id role isActive");
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "This account has been deactivated. Contact your administrator." });
    }

    req.user = { id: String(user._id), role: user.role };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

const optionalProtect = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
  } catch (_error) {
    req.user = null;
  }

  return next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return next();
};

module.exports = { optionalProtect, protect, requireRole };
