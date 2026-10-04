const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

const STATUSES = ['all', 'published', 'draft', 'archived'];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const statusOf = (course) => {
  if (course.deletedAt) return 'archived';
  return course.published ? 'published' : 'draft';
};

const countLessons = (course) =>
  course.modules.reduce((sum, module) => sum + module.lessons.length, 0);

// GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const [published, draft, archived, users, enrollments] = await Promise.all([
      Course.countDocuments({ published: true, deletedAt: null }),
      Course.countDocuments({ published: false, deletedAt: null }),
      Course.countDocuments({ deletedAt: { $ne: null } }),
      User.countDocuments({}),
      Enrollment.countDocuments({}),
    ]);

    return res.status(200).json({
      success: true,
      stats: { courses: { published, draft, archived }, users, enrollments },
    });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// GET /api/admin/courses?status=&search=&page=&limit=
const listCourses = async (req, res) => {
  try {
    const { status = 'all', search = '' } = req.query;
    for (const value of [status, search, req.query.page, req.query.limit]) {
      if (value !== undefined && typeof value !== 'string') {
        return fail(res, 400, 'Invalid query parameters');
      }
    }
    if (!STATUSES.includes(status)) return fail(res, 400, 'Invalid status');

    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;
    if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const filter = {};
    if (status === 'published') Object.assign(filter, { published: true, deletedAt: null });
    if (status === 'draft') Object.assign(filter, { published: false, deletedAt: null });
    if (status === 'archived') filter.deletedAt = { $ne: null };
    if (search.trim()) filter.title = new RegExp(escapeRegex(search.trim()), 'i');

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .select('title category level published deletedAt modules updatedAt')
        .sort({ updatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Course.countDocuments(filter),
    ]);

    const counts = await Enrollment.aggregate([
      { $match: { course: { $in: courses.map((course) => course._id) } } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]);
    const enrollmentsByCourse = new Map(counts.map((row) => [String(row._id), row.count]));

    return res.status(200).json({
      success: true,
      courses: courses.map((course) => ({
        _id: course._id,
        title: course.title,
        category: course.category,
        level: course.level,
        status: statusOf(course),
        lessons: countLessons(course),
        enrollments: enrollmentsByCourse.get(String(course._id)) || 0,
        updatedAt: course.updatedAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Admin list courses error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// GET /api/admin/users?search=&page=&limit=   (read-only; never returns password hashes or token data)
const listUsers = async (req, res) => {
  try {
    const { search = '' } = req.query;
    for (const value of [search, req.query.page, req.query.limit]) {
      if (value !== undefined && typeof value !== 'string') {
        return fail(res, 400, 'Invalid query parameters');
      }
    }

    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;
    if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const filter = {};
    const text = search.trim();
    if (text) {
      const pattern = new RegExp(escapeRegex(text), 'i');
      filter.$or = [{ name: pattern }, { email: pattern }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email role createdAt')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const counts = await Enrollment.aggregate([
      { $match: { user: { $in: users.map((user) => user._id) } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]);
    const enrollmentsByUser = new Map(counts.map((row) => [String(row._id), row.count]));

    return res.status(200).json({
      success: true,
      users: users.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        enrollments: enrollmentsByUser.get(String(user._id)) || 0,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Admin list users error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// GET /api/admin/courses/:id  (any status)
const getCourse = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid course ID');

    const [course, enrollments] = await Promise.all([
      Course.findById(req.params.id).select('-__v -instructor').lean(),
      Enrollment.countDocuments({ course: req.params.id }),
    ]);
    if (!course) return fail(res, 404, 'Course not found');

    return res.status(200).json({
      success: true,
      course: { ...course, status: statusOf(course), enrollments },
    });
  } catch (err) {
    console.error('Admin get course error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// PATCH /api/admin/courses/:id/restore  (back to a draft, never auto-published)
const restoreCourse = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid course ID');

    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, deletedAt: { $ne: null } },
      { $set: { deletedAt: null, published: false } },
      { new: true }
    ).select('title');
    if (!course) return fail(res, 404, 'Archived course not found');

    return res.status(200).json({ success: true, message: 'Course restored as a draft' });
  } catch (err) {
    console.error('Admin restore course error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// DELETE /api/admin/courses/:id/purge  { confirmTitle }
// Permanent. Only for archived courses with no enrollments, and the title must be typed.
const purgeCourse = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid course ID');

    const course = await Course.findById(req.params.id).select('title deletedAt').lean();
    if (!course) return fail(res, 404, 'Course not found');
    if (!course.deletedAt) return fail(res, 400, 'Archive the course before deleting it permanently');

    const confirmTitle = req.body && req.body.confirmTitle;
    if (typeof confirmTitle !== 'string' || confirmTitle.trim() !== course.title) {
      return fail(res, 400, 'Type the exact course title to confirm');
    }

    if (await Enrollment.exists({ course: course._id })) {
      return fail(res, 409, 'This course has enrolled students and cannot be deleted permanently');
    }

    await Course.deleteOne({ _id: course._id });
    return res.status(200).json({ success: true, message: 'Course deleted permanently' });
  } catch (err) {
    console.error('Admin purge course error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

module.exports = { getStats, listCourses, listUsers, getCourse, restoreCourse, purgeCourse };
