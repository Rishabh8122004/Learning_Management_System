require("dotenv").config();

const connectDB = require("./config/db");
const app = require("./app");
const { describeMailSettings } = require("./utils/mailer");

const PORT = process.env.PORT || 5000;

// Only start the database and the listener when run directly (tests import the app instead).
if (require.main === module) {
    // TEMPORARY: shows in the host logs whether the email settings arrived (never their values). Remove later.
    console.log("Mail settings seen by the server:", JSON.stringify(describeMailSettings()));

    connectDB(); // keeps retrying if the database is not reachable yet (see config/db.js)

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
