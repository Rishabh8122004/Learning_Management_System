const express = require('express');
const { getNotifications, markSeen } = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getNotifications);
router.post('/seen', markSeen);

module.exports = router;
