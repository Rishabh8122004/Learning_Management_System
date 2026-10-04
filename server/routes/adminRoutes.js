const express = require('express');
const {
  getStats,
  listCourses,
  listUsers,
  removeUser,
  getCourse,
  restoreCourse,
  purgeCourse,
} = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// Every admin route needs a valid login AND the admin role (enforced here, not just in the UI).
router.use(authMiddleware, adminMiddleware);

router.get('/stats', getStats);
router.get('/users', listUsers);
router.delete('/users/:id', removeUser);
router.get('/courses', listCourses);
router.get('/courses/:id', getCourse);
router.patch('/courses/:id/restore', restoreCourse);
router.delete('/courses/:id/purge', purgeCourse);

module.exports = router;
