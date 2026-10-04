const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set');
    return res.status(500).json({ success: false, message: 'Server error' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  // Role and version come from the DB, not the token, so changes apply immediately.
  // A missing tokenVersion (legacy users/tokens) counts as 0. A DB error propagates
  // to the global error handler (500) instead of being reported as a bad token.
  const user = await User.findById(decoded.id).select('role tokenVersion').lean();
  if (!user || (decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  req.user = { id: String(user._id), role: user.role };
  return next();
};

module.exports = authMiddleware;