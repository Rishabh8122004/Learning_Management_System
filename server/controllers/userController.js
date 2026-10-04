const bcrypt = require('bcryptjs');
const User = require('../models/User');
const safeUser = require('../utils/safeUser');
const { removeUserAndData } = require('../utils/removeUser');
const { signToken } = require('./authController');

const SALT_ROUNDS = 10;

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const isValidNewPassword = (password) =>
  typeof password === 'string' && password.length >= 8 && Buffer.byteLength(password) <= 72;

const onlyKeys = (body, allowed) =>
  body && typeof body === 'object' && Object.keys(body).every((key) => allowed.includes(key));

// Returns the user when the password matches. Callers answer a mismatch with 400, never 401:
// the client treats 401 as "session expired" and logs the user out.
const checkPassword = async (userId, password) => {
  if (typeof password !== 'string' || !password) return null;
  const user = await User.findById(userId);
  if (!user) return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
};

// PATCH /api/users/me  { name }
const updateMe = async (req, res) => {
  try {
    if (!onlyKeys(req.body, ['name'])) return fail(res, 400, 'Only name can be updated');

    const { name } = req.body;
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return fail(res, 400, 'Name must be between 2 and 100 characters');
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { name: name.trim() } },
      { new: true, runValidators: true }
    );
    if (!user) return fail(res, 404, 'User not found');

    return res.status(200).json({ success: true, user: safeUser(user) });
  } catch (err) {
    console.error('Update profile error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// PATCH /api/users/me/password  { currentPassword, newPassword }
const changePassword = async (req, res) => {
  try {
    if (!onlyKeys(req.body, ['currentPassword', 'newPassword'])) {
      return fail(res, 400, 'Provide currentPassword and newPassword');
    }
    const { currentPassword, newPassword } = req.body;

    if (!isValidNewPassword(newPassword)) {
      return fail(res, 400, 'New password must be 8 to 72 bytes long');
    }

    const user = await checkPassword(req.user.id, currentPassword);
    if (!user) return fail(res, 400, 'Current password is incorrect');
    if (newPassword === currentPassword) {
      return fail(res, 400, 'New password must be different from the current one');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Bumping tokenVersion logs out every other session. The version check makes
    // two simultaneous changes safe: only one can win.
    const updated = await User.findOneAndUpdate(
      { _id: user._id, tokenVersion: user.tokenVersion ?? 0 },
      { $set: { passwordHash }, $inc: { tokenVersion: 1 } },
      { new: true }
    );
    if (!updated) return fail(res, 409, 'Your account changed, please try again');

    return res.status(200).json({ success: true, token: signToken(updated), user: safeUser(updated) });
  } catch (err) {
    console.error('Change password error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// DELETE /api/users/me  { password }
const deleteMe = async (req, res) => {
  try {
    if (!onlyKeys(req.body, ['password'])) return fail(res, 400, 'Provide your password');

    const user = await checkPassword(req.user.id, req.body.password);
    if (!user) return fail(res, 400, 'Password is incorrect');

    if (user.role === 'admin' && (await User.countDocuments({ role: 'admin' })) <= 1) {
      return fail(res, 400, 'You are the only admin, so this account cannot be deleted');
    }

    await removeUserAndData(user._id);

    return res.status(200).json({ success: true, message: 'Account deleted' });
  } catch (err) {
    console.error('Delete account error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

module.exports = { updateMe, changePassword, deleteMe };
