const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const safeUser = require('../utils/safeUser');
const { sendMail } = require('../utils/mailer');
const { removeUserAndData } = require('../utils/removeUser');

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

// Decides whether an email can be used for a new or changed account. Someone may have typed an address that is
// not theirs and never confirmed it. After a day the real owner may use it; the unconfirmed account (which never
// had a login) is replaced. Returns null when the address is free, otherwise { status, message }.
const claimEmail = async (normalizedEmail) => {
  const existing = await User.findOne({ email: normalizedEmail }).select('emailVerified createdAt verifyEmailExpires');
  if (!existing) return null;

  // "Stale" means its confirmation link has run out, which is also the moment the expiry index removes it.
  // (A resend moves that moment forward, so a fresh resend protects the account for another day.)
  const unconfirmed = existing.emailVerified === false;
  const lapsedAt = existing.verifyEmailExpires
    ? new Date(existing.verifyEmailExpires).getTime()
    : new Date(existing.createdAt).getTime() + VERIFY_HOURS * 3600 * 1000;
  const stale = unconfirmed && lapsedAt < Date.now();

  if (!stale) {
    return {
      status: 409,
      message: unconfirmed
        ? 'This email is waiting to be confirmed. Check your inbox, or ask for a new link on the login page.'
        : 'Email is already registered',
    };
  }

  await User.deleteOne({ _id: existing._id, emailVerified: false });
  return null;
};

// Proves that a person who cannot log in yet (email not confirmed) owns the account, by its password.
// Used by the "wrong email" options on the login page. Returns { user } or { status, message }.
const unconfirmedAccount = async (email, password) => {
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return { status: 400, message: 'Email and password are required' };
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  const passwordMatches = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  if (!user || !passwordMatches) return { status: 401, message: 'Invalid email or password' };
  if (user.emailVerified !== false) return { status: 400, message: 'This account is already confirmed. Log in instead.' };

  return { user };
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

    const blocked = await claimEmail(normalizedEmail);
    if (blocked) return fail(res, blocked.status, blocked.message);

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
          `<p>Hi ${plainName(user.name)},</p>` +
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

// POST /api/auth/unconfirmed/change-email  { email, password, newEmail }
// For someone who typed the wrong (or a fake) address when registering: with the password, move the account to
// the right address and send the confirmation link there.
const changeUnconfirmedEmail = async (req, res) => {
  try {
    const { email, password, newEmail } = req.body || {};

    const found = await unconfirmedAccount(email, password);
    if (!found.user) return fail(res, found.status, found.message);

    if (typeof newEmail !== 'string' || !EMAIL_REGEX.test(newEmail.trim())) {
      return fail(res, 400, 'A valid new email is required');
    }
    const normalized = newEmail.trim().toLowerCase();
    if (normalized === found.user.email) return fail(res, 400, 'That is the email already on this account');

    const blocked = await claimEmail(normalized);
    if (blocked) return fail(res, blocked.status, blocked.message);

    const { token, hash } = newEmailToken();
    await User.updateOne(
      { _id: found.user._id },
      {
        $set: {
          email: normalized,
          verifyEmailHash: hash,
          verifyEmailExpires: new Date(Date.now() + VERIFY_HOURS * 3600 * 1000),
        },
      }
    );

    const emailSent = await sendVerificationEmail({ name: found.user.name, email: normalized }, token);
    return res.status(200).json({
      success: true,
      emailSent,
      email: normalized,
      message: emailSent
        ? 'Email changed. Check the new inbox for the confirmation link.'
        : 'Email changed, but the confirmation email could not be sent. Try "Resend confirmation email" in a few minutes.',
    });
  } catch (err) {
    if (err && err.code === 11000) return fail(res, 409, 'Email is already registered'); // race condition
    console.error('Change unconfirmed email error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// POST /api/auth/unconfirmed/delete  { email, password }
// Lets someone who registered with a fake address remove the account themselves. Only accounts that were never
// confirmed can be removed this way (they have no data); confirmed users delete from their profile.
const deleteUnconfirmedAccount = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    const found = await unconfirmedAccount(email, password);
    if (!found.user) return fail(res, found.status, found.message);

    await removeUserAndData(found.user._id);
    return res.status(200).json({ success: true, message: 'Account deleted. You can register again with a real email.' });
  } catch (err) {
    console.error('Delete unconfirmed account error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// POST /api/users/me/email  { newEmail, password }   (signed in)
// The email does not change yet: a link goes to the NEW address, and only opening it switches the account over.
// So an address that is not the person's own can never be attached to an account.
const requestEmailChange = async (req, res) => {
  try {
    const { newEmail, password } = req.body || {};
    const keys = Object.keys(req.body || {});

    if (keys.some((key) => !['newEmail', 'password'].includes(key))) {
      return fail(res, 400, 'Provide newEmail and password');
    }
    if (typeof newEmail !== 'string' || !EMAIL_REGEX.test(newEmail.trim())) {
      return fail(res, 400, 'A valid new email is required');
    }

    // A wrong password is a 400, never 401: the website treats 401 as "session expired" and logs the person out.
    const user = await User.findById(req.user.id);
    if (!user || typeof password !== 'string' || !password || !(await bcrypt.compare(password, user.passwordHash))) {
      return fail(res, 400, 'Password is incorrect');
    }

    const normalized = newEmail.trim().toLowerCase();
    if (normalized === user.email) return fail(res, 400, 'That is already your email');

    const taken = await User.findOne({ email: normalized }).select('_id');
    if (taken) return fail(res, 409, 'Email is already registered');

    const { token, hash } = newEmailToken();
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          pendingEmail: normalized,
          pendingEmailHash: hash,
          pendingEmailExpires: new Date(Date.now() + VERIFY_HOURS * 3600 * 1000),
        },
      }
    );

    const link = `${appUrl()}/confirm-email-change?token=${token}`;
    const emailSent = await sendMail({
      to: normalized,
      subject: 'Confirm your new Trackly email',
      text:
        `Hi ${user.name},\n\nConfirm that this is your new email for Trackly (valid for ${VERIFY_HOURS} hours):\n${link}\n\n` +
        'If you did not ask for this, ignore this email. Nothing will change.',
      html:
        `<p>Hi ${plainName(user.name)},</p><p>Confirm that this is your new email for Trackly (valid for ${VERIFY_HOURS} hours):</p>` +
        `<p><a href="${link}">Confirm my new email</a></p><p>If you did not ask for this, ignore this email. Nothing will change.</p>`,
    });

    return res.status(200).json({
      success: true,
      emailSent,
      email: normalized,
      message: emailSent
        ? 'Check your new inbox and click the link to finish. Your email changes only after that.'
        : 'We could not send the confirmation email right now. Please try again in a few minutes.',
    });
  } catch (err) {
    console.error('Request email change error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// POST /api/auth/confirm-email-change  { token }
const confirmEmailChange = async (req, res) => {
  try {
    const { token } = req.body || {};

    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return fail(res, 400, 'This confirmation link is invalid or has expired');
    }

    const user = await User.findOne({
      pendingEmailHash: hashToken(token),
      pendingEmailExpires: { $gt: new Date() },
    }).select('+pendingEmail email name');

    if (!user || !user.pendingEmail) {
      return fail(res, 400, 'This confirmation link is invalid or has expired');
    }

    const taken = await User.findOne({ email: user.pendingEmail }).select('_id');
    if (taken) return fail(res, 409, 'That email is now used by another account');

    const oldEmail = user.email;
    await User.updateOne(
      { _id: user._id },
      {
        $set: { email: user.pendingEmail, emailVerified: true },
        $unset: { pendingEmail: '', pendingEmailHash: '', pendingEmailExpires: '' },
      }
    );

    // Tell the old address too, so a change the owner did not make gets noticed. Not awaited on purpose.
    sendMail({
      to: oldEmail,
      subject: 'Your Trackly email was changed',
      text: `The email on your Trackly account was changed to ${user.pendingEmail}. If this was not you, reset your password right away.`,
      html: `<p>The email on your Trackly account was changed to ${plainName(user.pendingEmail)}. If this was not you, reset your password right away.</p>`,
    });

    return res.status(200).json({ success: true, message: 'Your email has been changed.', email: user.pendingEmail });
  } catch (err) {
    if (err && err.code === 11000) return fail(res, 409, 'That email is now used by another account');
    console.error('Confirm email change error:', err.message);
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

module.exports = {
  register,
  login,
  getMe,
  signToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changeUnconfirmedEmail,
  deleteUnconfirmedAccount,
  requestEmailChange,
  confirmEmailChange,
};