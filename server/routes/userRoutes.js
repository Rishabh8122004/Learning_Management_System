const express = require('express');
const rateLimit = require('express-rate-limit');
const { updateMe, changePassword, deleteMe } = require('../controllers/userController');
const { requestEmailChange } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Password-guessing protection for the two endpoints that check the current password.
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

router.use(authMiddleware);

router.patch('/me', updateMe);
router.patch('/me/password', sensitiveLimiter, changePassword);
router.post('/me/email', sensitiveLimiter, requestEmailChange);
router.delete('/me', sensitiveLimiter, deleteMe);

module.exports = router;
