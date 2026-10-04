const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Goal = require('../models/Goal');
const GoalEntry = require('../models/GoalEntry');

// Deletes a person and everything they own, in one place (used when they delete their own account and
// when an admin removes them). Courses are shared, so they are kept.
async function removeUserAndData(userId) {
  await Promise.all([
    Enrollment.deleteMany({ user: userId }),
    GoalEntry.deleteMany({ user: userId }),
    Goal.deleteMany({ user: userId }),
  ]);
  await User.deleteOne({ _id: userId });
}

module.exports = { removeUserAndData };
