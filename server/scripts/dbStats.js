// Read-only storage report for the 512 MB Atlas limit:
//   node scripts/dbStats.js
// Only reads statistics. It never writes, and prints no document contents or secrets.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');

const LIMIT_BYTES = 512 * 1024 * 1024;
const WARN_AT = 0.7;

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in server/.env');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const rows = [];

  for (const { name } of collections) {
    const stats = await db.command({ collStats: name });
    rows.push({
      collection: name,
      documents: stats.count,
      'avg doc (B)': Math.round(stats.avgObjSize || 0),
      'data (MB)': Number((stats.size / 1024 / 1024).toFixed(3)),
      'indexes (MB)': Number((stats.totalIndexSize / 1024 / 1024).toFixed(3)),
      storageBytes: stats.storageSize + stats.totalIndexSize,
    });
  }

  rows.sort((a, b) => b.storageBytes - a.storageBytes);
  console.table(rows.map(({ storageBytes, ...row }) => row));

  const used = rows.reduce((sum, row) => sum + row.storageBytes, 0);
  const share = used / LIMIT_BYTES;

  console.log(`Storage used (data + indexes on disk): ${mb(used)} of ${mb(LIMIT_BYTES)} (${(share * 100).toFixed(1)}%)`);
  if (share >= WARN_AT) {
    console.log('WARNING: more than 70% of the free-tier limit is used. Review what is growing.');
  }
}

main()
  .catch((err) => {
    console.error('dbStats failed:', err.name);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
