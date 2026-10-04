// Adds the showcase courses from showcaseCourses.js to the catalog, published, owned by an existing admin.
// Run by the owner, who has database access:
//   node scripts/seedShowcaseCourses.js <admin-email>            (dry run: only shows what would happen)
//   node scripts/seedShowcaseCourses.js <admin-email> --apply    (writes the courses)
// A course whose title already exists is skipped, so running it twice never creates duplicates.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const { showcaseCourses } = require('./showcaseCourses');

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const emailArg = args.find((arg) => !arg.startsWith('--'));

  if (!emailArg) {
    console.error('Usage: node scripts/seedShowcaseCourses.js <admin-email> [--apply]');
    process.exitCode = 1;
    return;
  }
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in server/.env');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);

  const admin = await User.findOne({ email: emailArg.trim().toLowerCase(), role: 'admin' }).select('_id name email');
  if (!admin) {
    console.error('No admin found with that email. Make the account an admin first (scripts/setRole.js).');
    process.exitCode = 1;
    return;
  }

  console.log(apply ? `APPLY: writing courses as ${admin.email}` : `DRY RUN (nothing is written). Courses would belong to ${admin.email}`);

  for (const course of showcaseCourses) {
    const exists = await Course.exists({ title: course.title, deletedAt: null });
    const lessons = course.modules.reduce((sum, mod) => sum + mod.lessons.length, 0);

    if (exists) {
      console.log(`  skip   "${course.title}" (already exists)`);
      continue;
    }

    console.log(`  ${apply ? 'create' : 'would create'} "${course.title}" (${course.modules.length} modules, ${lessons} lessons)`);

    if (apply) {
      await Course.create({ ...course, instructor: admin._id, published: true, publishedAt: new Date() });
    }
  }

  if (!apply) console.log('Run again with --apply to write these courses.');
}

main()
  .catch((err) => {
    console.error('Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
