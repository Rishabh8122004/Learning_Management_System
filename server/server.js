require("dotenv").config();

const connectDB = require("./config/db");
const app = require("./app");

const PORT = process.env.PORT || 5000;

// Only start the database and the listener when run directly (tests import the app instead).
if (require.main === module) {
    connectDB(); // keeps retrying if the database is not reachable yet (see config/db.js)

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
