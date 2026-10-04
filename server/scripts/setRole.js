// Grant or remove the admin role. Run by someone with database access:
//   node scripts/setRole.js <email> <admin|user>
// There is deliberately no API for this.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const [emailArg, role] = process.argv.slice(2);

  if (!emailArg || !['admin', 'user'].includes(role)) {
    console.error('Usage: node scripts/setRole.js <email> <admin|user>');
    process.exitCode = 1;
    return;
  }
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in server/.env');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);

  const email = emailArg.trim().toLowerCase();
  const user = await User.findOne({ email }).select('name email role');
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exitCode = 1;
    return;
  }

  if (user.role === role) {
    console.log(`${user.email} is already "${role}". Nothing changed.`);
    return;
  }

  if (user.role === 'admin' && (await User.countDocuments({ role: 'admin' })) <= 1) {
    console.error('Refusing to remove the last admin.');
    process.exitCode = 1;
    return;
  }

  // Bumping tokenVersion makes the user sign in again so the new role applies cleanly.
  await User.updateOne({ _id: user._id }, { $set: { role }, $inc: { tokenVersion: 1 } });
  console.log(`${user.email} (${user.name}): "${user.role}" -> "${role}". They must log in again.`);
}

main()
  .catch((err) => {
    console.error('setRole failed:', err.name);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
