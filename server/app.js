const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const goalRoutes = require("./routes/goalRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const courseRoutes = require('./routes/courseRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');

const app = express();

// Behind a host's proxy (Render, Railway) the real visitor address is in X-Forwarded-For;
// trusting one proxy hop makes the rate limits count each visitor separately.
app.set("trust proxy", 1);

app.use(helmet());

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));

app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/courses', courseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/goals", goalRoutes);

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "LMS backend is running"
    });
});

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

app.use((err, req, res, next) => {
    if (err.type === "entity.too.large") {
        return res.status(413).json({
            success: false,
            message: "Request body is too large"
        });
    }

    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON in request body"
        });
    }

    if (err.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            message: "Invalid input data"
        });
    }

    if (err.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: "Invalid ID or value"
        });
    }

    if (err.status >= 400 && err.status < 500) {
        return res.status(err.status).json({
            success: false,
            message: err.message || "Bad request"
        });
    }

    console.error("Unhandled error:", err);
    return res.status(500).json({
        success: false,
        message: "Something went wrong"
    });
});

module.exports = app;
