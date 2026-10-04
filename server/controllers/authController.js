const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const safeUser = require('../utils/safeUser');
const { sendMail } = require('../utils/mailer');

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Used so login takes similar time whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', SALT_ROUNDS);

const RESET_MINUTES = 60;
const VERIFY_HOURS = 24;
const RESEND_MESSAGE = 'If that account is waiting for confirmation, a new link has been sent. Check your inbox.';
const FORGOT_MESSAGE = 'If that email is registered, a reset link has been sent. Check your inbox.';

// Only this hash is stored, so a copy of the database cannot be used to reset anyone's password.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const plainName = (name) => String(name).replace(/[<>&"]/g, '');

// Emails the link that confirms the address really belongs to the person who registered.
const sendVerificationEmail = (user, token) => {
  const link = `${appUrl()}/verify-email?token=${token}`;

  return sendMail({
    to: user.email,
    subject: 'Confirm your email for Trackly',
    text:
      `Hi ${user.name},\n\nWelcome to Trackly. Confirm your email address with this link (valid for ${VERIFY_HOURS} hours):\n${link}\n\n` +
      'If you did not create this account, you can ignore this email.',
    html:
      `<p>Hi ${plainName(user.name)},</p><p>Welcome to Trackly. Confirm your email address (valid for ${VERIFY_HOURS} hours):</p>` +
      `<p><a href="${link}">Confirm my email</a></p><p>If you did not create this account, you can ignore this email.</p>`,
  });
};

// A fresh random token and the hash that is stored in its place.
const newEmailToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
};

// The address of the website, used to build the link in the email (first CLIENT_ORIGIN unless APP_URL is set).
const appUrl = () =>
  (process.env.APP_URL || (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0])
    .trim()
    .replace(/\/+$/, '');

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

    const existing = await User.findOne({ email: normalizedEmail }).select('emailVerified createdAt');
    if (existing) {
      // Someone may have typed an address that is not theirs and never confirmed it. After a day, the real
      // owner may register with it; the unconfirmed account (which never had a login) is replaced.
      const unconfirmed = existing.emailVerified === false;
      const stale = unconfirmed && Date.now() - new Date(existing.createdAt).getTime() > VERIFY_HOURS * 3600 * 1000;

      if (!stale) {
        return fail(
          res,
          409,
          unconfirmed
            ? 'This email is waiting to be confirmed. Check your inbox, or ask for a new link on the login page.'
            : 'Email is already registered'
        );
      }
      await User.deleteOne({ _id: existing._id, emailVerified: false });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const { token, hash } = newEmailToken();
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'user',
      emailVerified: false,
      verifyEmailHash: hash,
      verifyEmailExpires: new Date(Date.now() + VERIFY_HOURS * 3600 * 1000),
    });

    // No login token yet: the account works only after the emailed link is opened.
    const emailSent = await sendVerificationEmail(user, token);
    return res.status(201).json({
      success: true,
      verificationRequired: true,
      emailSent,
      message: emailSent
        ? 'Account created. Check your email and click the confirmation link to finish.'
        : 'Account created, but the confirmation email could not be sent. Try "Resend confirmation email" on the login page later.',
    });
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

    // Only someone who knows the password sees this, so it does not reveal which emails exist.
    if (user.emailVerified === false) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please confirm your email address first. Check your inbox for the confirmation link.',
      });
    }

    const token = signToken(user);
    return res.status(200).json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// POST /api/auth/forgot-password  { email }
// The answer is the same whether or not the email exists, so nobody can use this to find out who is registered.
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return fail(res, 400, 'A valid email is required');
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('name email');

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            resetPasswordHash: hashToken(token),
            resetPasswordExpires: new Date(Date.now() + RESET_MINUTES * 60 * 1000),
          },
        }
      );

      const link = `${appUrl()}/reset-password?token=${token}`;

      // Not awaited on purpose: the response time is the same for registered and unknown emails.
      sendMail({
        to: user.email,
        subject: 'Reset your Trackly password',
        text:
          `Hi ${user.name},\n\nUse this link to choose a new password (valid for ${RESET_MINUTES} minutes):\n${link}\n\n` +
          'If you did not ask for this, you can ignore this email. Your password will not change.',
        html:
          `<p>Hi ${user.name.replace(/[<>&"]/g, '')},</p>` +
          `<p>Use this link to choose a new password (valid for ${RESET_MINUTES} minutes):</p>` +
          `<p><a href="${link}">Reset my password</a></p>` +
          '<p>If you did not ask for this, you can ignore this email. Your password will not change.</p>',
      });
    }

    return res.status(200).json({ success: true, message: FORGOT_MESSAGE });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// POST /api/auth/reset-password  { token, password }
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return fail(res, 400, 'This reset link is invalid or has expired');
    }
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
      return fail(res, 400, 'Password must be 8 to 72 bytes long');
    }

    const user = await User.findOne({
      resetPasswordHash: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    }).select('_id');

    if (!user) {
      return fail(res, 400, 'This reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // The link works once: the token fields are removed. Bumping tokenVersion signs out every device.
    // Opening the emailed reset link also proves the inbox is theirs, so the address counts as confirmed.
    await User.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash, emailVerified: true },
        $unset: { resetPasswordHash: '', resetPasswordExpires: '', verifyEmailHash: '', verifyEmailExpires: '' },
        $inc: { tokenVersion: 1 },
      }
    );

    return res.status(200).json({ success: true, message: 'Your password has been changed. You can log in now.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// POST /api/auth/verify-email  { token }
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body || {};

    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return fail(res, 400, 'This confirmation link is invalid or has expired');
    }

    const user = await User.findOne({
      verifyEmailHash: hashToken(token),
      verifyEmailExpires: { $gt: new Date() },
    }).select('_id');

    if (!user) {
      return fail(res, 400, 'This confirmation link is invalid or has expired');
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { emailVerified: true }, $unset: { verifyEmailHash: '', verifyEmailExpires: '' } }
    );

    return res.status(200).json({ success: true, message: 'Your email is confirmed. You can log in now.' });
  } catch (err) {
    console.error('Verify email error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// POST /api/auth/resend-verification  { email }
// Same answer whether or not the account exists or is already confirmed.
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return fail(res, 400, 'A valid email is required');
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('name email emailVerified');

    if (user && user.emailVerified === false) {
      const { token, hash } = newEmailToken();
      await User.updateOne(
        { _id: user._id },
        { $set: { verifyEmailHash: hash, verifyEmailExpires: new Date(Date.now() + VERIFY_HOURS * 3600 * 1000) } }
      );
      sendVerificationEmail(user, token);
    }

    return res.status(200).json({ success: true, message: RESEND_MESSAGE });
  } catch (err) {
    console.error('Resend verification error:', err.message);
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

module.exports = { register, login, getMe, signToken, forgotPassword, resetPassword, verifyEmail, resendVerification };