const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const safeUser = require('../utils/safeUser');

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Used so login takes similar time whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', SALT_ROUNDS);

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const signToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  const payload = {
    id: user._id.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion ?? 0,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    // Only these three fields are read. Any client-supplied role is ignored.
    const { name, email, password } = req.body || {};

    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return fail(res, 400, 'Name must be between 2 and 100 characters');
    }
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return fail(res, 400, 'A valid email is required');
    }
    // bcrypt only uses the first 72 bytes, so cap the length.
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
      return fail(res, 400, 'Password must be 8 to 72 bytes long');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return fail(res, 409, 'Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'user',
    });

    const token = signToken(user);
    return res.status(201).json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    if (err && err.code === 11000) {
      return fail(res, 409, 'Email is already registered'); // race condition
    }
    console.error('Register error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return fail(res, 400, 'Email and password are required');
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
    const passwordMatches = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatches) {
      return fail(res, 401, 'Invalid email or password');
    }

    const token = signToken(user);
    return res.status(200).json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// GET /api/auth/me  (protected by authMiddleware)
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name email role createdAt');
    if (!user) {
      return fail(res, 401, 'User no longer exists');
    }
    return res.status(200).json({ success: true, user: safeUser(user) });
  } catch (err) {
    console.error('GetMe error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

module.exports = { register, login, getMe, signToken };