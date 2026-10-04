const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must be at most 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    // Stores ONLY the hash. Hashing happens in the auth controller later.
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // When the user last opened the notification bell. Missing means "since sign-up".
    notificationsSeenAt: {
      type: Date,
      default: null,
    },
    // New accounts start unconfirmed and must click the emailed link. Older accounts have no value stored
    // and read as true, so nobody who already registered is locked out.
    emailVerified: { type: Boolean, default: true },
    verifyEmailHash: { type: String, default: null, select: false },
    verifyEmailExpires: { type: Date, default: null, select: false },
    // Changing the email: the new address waits here until its owner clicks the emailed link.
    pendingEmail: { type: String, default: null, select: false, lowercase: true, trim: true },
    pendingEmailHash: { type: String, default: null, select: false },
    pendingEmailExpires: { type: Date, default: null, select: false },
    // Password reset: only a hash of the emailed token is stored, and it expires. Both are cleared once used.
    resetPasswordHash: { type: String, default: null, select: false },
    resetPasswordExpires: { type: Date, default: null, select: false },
    // Bump to invalidate every token issued before (password/role change, deletion).
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, collection: 'users' }
);

module.exports = mongoose.model('User', userSchema);