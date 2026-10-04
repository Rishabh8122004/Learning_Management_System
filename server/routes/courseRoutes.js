const express = require('express');
const {
  createCourse,
  updateCourse,
  deleteCourse,
  listCourses,
  getCourse,
} = require('../controllers/courseController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// Public
router.get('/', listCourses);
router.get('/:id', getCourse);

// Admin only
router.post('/', authMiddleware, adminMiddleware, createCourse);
router.put('/:id', authMiddleware, adminMiddleware, updateCourse);
router.delete('/:id', authMiddleware, adminMiddleware, deleteCourse);

module.exports = router;