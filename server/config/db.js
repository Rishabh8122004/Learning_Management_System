const mongoose = require("mongoose");

const FIRST_WAIT_MS = 2000;
const LONGEST_WAIT_MS = 30000;
const GIVE_UP_AFTER_MS = 10 * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Tries to connect again and again, waiting a little longer each time (2 s, 4 s, ... up to 30 s),
// instead of crashing on the first failure. A common cause is that MongoDB Atlas does not know the
// current internet address yet: once it is added in Atlas, the next attempt succeeds by itself.
// The dependencies are passed in so this can be tested without a database. Returns true once connected,
// false if it gave up. The connection string is never printed.
async function connectWithRetry({
  connect,
  wait = sleep,
  log = console,
  giveUpAfterMs = GIVE_UP_AFTER_MS,
} = {}) {
  let delay = FIRST_WAIT_MS;
  let waited = 0;
  let attempt = 0;

  for (;;) {
    attempt += 1;

    try {
      await connect();
      log.log("MongoDB connected successfully");
      return true;
    } catch (error) {
      log.error(`MongoDB connection failed (attempt ${attempt}): ${error.message}`);

      if (waited + delay > giveUpAfterMs) {
        log.error("Giving up on MongoDB. Check MONGO_URI and the Atlas Network Access list, then restart the server.");
        return false;
      }

      log.error(
        `Trying again in ${delay / 1000}s. If this keeps happening, add your current IP address in ` +
          "MongoDB Atlas > Network Access (the server will connect by itself once it is allowed).",
      );

      await wait(delay);
      waited += delay;
      delay = Math.min(delay * 2, LONGEST_WAIT_MS);
    }
  }
}

const connectDB = async () => {
  const connected = await connectWithRetry({
    // Fail each attempt after 8 seconds instead of the default 30, so retries start sooner.
    connect: () => mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 }),
  });

  if (!connected) process.exit(1);
};

module.exports = connectDB;
module.exports.connectWithRetry = connectWithRetry;
