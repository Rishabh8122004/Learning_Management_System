const express = require('express');
const {
  enroll,
  getMyEnrollments,
  getEnrollment,
  completeLesson,
  unenroll,
} = require('../controllers/enrollmentController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All enrollment routes require login. No admin bypass: everyone only sees their own data.
router.use(authMiddleware);

router.get('/me', getMyEnrollments);
router.get('/:id', getEnrollment);
router.delete('/:id', unenroll);
router.post('/:id/lessons/:lessonId/complete', completeLesson);
router.post('/:courseId', enroll);
module.exports = router;
