// READ-ONLY data check for the leftovers listed in capstone C13.
// It never writes, drops or changes anything. Run it from the server folder:  node scripts/dataCheck.js
// Fixing what it finds is a separate step that needs the owner's approval (production data).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in server/.env');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  // 1. Old non-unique goalEntries index (the collection name is matched ignoring capital letters)
  const names = (await db.listCollections().toArray()).map((c) => c.name);
  const entriesName = names.find((name) => name.toLowerCase() === 'goalentries');
  if (entriesName) {
    const indexes = await db.collection(entriesName).indexes();
    const old = indexes.filter((i) => i.name === 'user_1_goal_1_localDate_1' && !i.unique);
    console.log(old.length ? 'Old non-unique goalEntries index is still present.' : 'No old goalEntries index.');
  }

  // 2. Lessons whose link is not http(s)
  const badLessons = [];
  for await (const course of db.collection('courses').find({}, { projection: { title: 1, modules: 1 } })) {
    for (const mod of course.modules || []) {
      for (const lesson of mod.lessons || []) {
        if (!/^https?:\/\//i.test(lesson.content || '')) {
          badLessons.push(`"${course.title}" > "${mod.title}" > "${lesson.title}"`);
        }
      }
    }
  }
  console.log(`Lessons without an http(s) link: ${badLessons.length}`);
  badLessons.forEach((line) => console.log('  - ' + line));

  // 3. Sub-goals due after their parent
  const goals = await db.collection('goals').find({}, { projection: { title: 1, parentGoal: 1, targetDate: 1 } }).toArray();
  const byId = new Map(goals.map((g) => [String(g._id), g]));
  const late = goals.filter((g) => {
    const parent = g.parentGoal && byId.get(String(g.parentGoal));
    return parent && g.targetDate && parent.targetDate && g.targetDate > parent.targetDate;
  });
  console.log(`Sub-goals due after their parent: ${late.length}`);
  late.forEach((g) => console.log(`  - "${g.title}" (${g.targetDate.toISOString().slice(0, 10)}) after "${byId.get(String(g.parentGoal)).title}"`));
}

main()
  .catch((err) => {
    console.error('Check failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
