const express = require("express");
const rateLimit = require("express-rate-limit");
const {
    register, login, getMe, forgotPassword, resetPassword, verifyEmail, resendVerification,
    changeUnconfirmedEmail, deleteUnconfirmedAccount
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many attempts, please try again later."
    }
});

// Stricter: every request can cause an email to be sent.
const forgotRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many attempts, please try again later."
    }
});

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.post("/forgot-password", forgotRateLimiter, forgotPassword);
router.post("/reset-password", authRateLimiter, resetPassword);
router.post("/verify-email", authRateLimiter, verifyEmail);
router.post("/resend-verification", forgotRateLimiter, resendVerification);
router.post("/unconfirmed/change-email", authRateLimiter, changeUnconfirmedEmail);
router.post("/unconfirmed/delete", authRateLimiter, deleteUnconfirmedAccount);
router.get("/me", authMiddleware, getMe);

module.exports = router;
