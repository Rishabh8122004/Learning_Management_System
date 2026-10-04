const Course = require('../models/Course');
const { recomputeEnrollmentProgress } = require('../utils/progress');

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const ALLOWED_FIELDS = [
  'title',
  'description',
  'category',
  'level',
  'thumbnail',
  'modules',
  'tags',
  'published',
];
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const isValidId = (id) => typeof id === 'string' && OBJECT_ID_REGEX.test(id);
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Maps Mongoose validation/cast errors to 400, everything else to 500.
const handleError = (res, err, label) => {
  if (err && (err.name === 'ValidationError' || err.name === 'CastError')) {
    const message =
      err.name === 'ValidationError'
        ? Object.values(err.errors).map((e) => e.message).join('; ')
        : `Invalid value for ${err.path}`;
    return fail(res, 400, message);
  }
  console.error(`${label} error:`, err);
  return fail(res, 500, 'Server error');
};

// Picks only whitelisted fields from the body (blocks deletedAt, _id, timestamps, etc.)
const pickAllowed = (body) => {
  const data = {};
  if (!body || typeof body !== 'object') return data;
  ALLOWED_FIELDS.forEach((field) => {
    if (body[field] !== undefined) data[field] = body[field];
  });
  return data;
};

const adminView = (course) => {
  const obj = course.toObject();
  delete obj.__v;
  return obj;
};

// POST /api/courses  (admin)
const createCourse = async (req, res) => {
  try {
    const data = pickAllowed(req.body);

    // Legacy field: always the creating admin, never taken from the request.
    data.instructor = req.user.id;
    if (data.published === true) data.publishedAt = new Date();

    const course = await Course.create(data);
    return res.status(201).json({ success: true, course: adminView(course) });
  } catch (err) {
    return handleError(res, err, 'Create course');
  }
};

// PUT /api/courses/:id  (admin)
// Uses find + set + save so schema validators always run.
// Note: if `modules` is sent, it replaces the whole array. Send existing
// module/lesson _id values to keep them stable (later phases reference lesson _ids).
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return fail(res, 400, 'Invalid course ID');

    const data = pickAllowed(req.body);
    if (Object.keys(data).length === 0) return fail(res, 400, 'No valid fields to update');

    const course = await Course.findById(id);
    if (!course || course.deletedAt) return fail(res, 404, 'Course not found');

    course.set(data);
    if (data.published === true && !course.publishedAt) course.publishedAt = new Date();
    await course.save();

    // Lessons may have been added or removed: keep students' progress honest.
    if (data.modules !== undefined) await recomputeEnrollmentProgress(course);

    return res.status(200).json({ success: true, course: adminView(course) });
  } catch (err) {
    return handleError(res, err, 'Update course');
  }
};

// DELETE /api/courses/:id  (admin) - soft delete only
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return fail(res, 400, 'Invalid course ID');

    const course = await Course.findById(id);
    if (!course || course.deletedAt) return fail(res, 404, 'Course not found');

    course.deletedAt = new Date();
    course.published = false;
    await course.save();
    return res.status(200).json({ success: true, message: 'Course archived' });
  } catch (err) {
    return handleError(res, err, 'Delete course');
  }
};

// GET /api/courses  (public)
const listCourses = async (req, res) => {
  try {
    const { search, category, level } = req.query;

    // Query params must be plain strings (blocks ?category[$ne]=x style injection)
    for (const value of [req.query.page, req.query.limit, search, category, level]) {
      if (value !== undefined && typeof value !== 'string') {
        return fail(res, 400, 'Invalid query parameters');
      }
    }

    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;
    if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const filter = { published: true, deletedAt: null };

    const searchText = search ? search.trim() : '';
    if (searchText) filter.$text = { $search: searchText };

    if (category && category.trim()) {
      filter.category = new RegExp(`^${escapeRegex(category.trim())}$`, 'i');
    }

    if (level && level.trim()) {
      const normalizedLevel = level.trim().toLowerCase();
      if (!LEVELS.includes(normalizedLevel)) return fail(res, 400, 'Invalid level');
      filter.level = normalizedLevel;
    }

    // Stable sort so pagination does not skip/repeat items.
    const sort = searchText
      ? { score: { $meta: 'textScore' }, _id: 1 }
      : { createdAt: -1, _id: -1 };

    const [courses, total] = await Promise.all([
      Course.find(filter)
        // Listing stays light: only the module ids are read (to count them); full content is in details.
        .select('-deletedAt -__v -modules.title -modules.description -modules.order -modules.lessons')
        .populate('instructor', 'name')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Course.countDocuments(filter),
    ]);

    const summaries = courses.map(({ modules, ...course }) => ({
      ...course,
      moduleCount: Array.isArray(modules) ? modules.length : 0,
    }));

    return res.status(200).json({
      success: true,
      courses: summaries,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return handleError(res, err, 'List courses');
  }
};

// GET /api/courses/:id  (public)
const getCourse = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return fail(res, 400, 'Invalid course ID');

    const course = await Course.findOne({ _id: id, published: true, deletedAt: null })
      .select('-deletedAt -__v')
      .populate('instructor', 'name')
      .lean();

    if (!course) return fail(res, 404, 'Course not found');
    return res.status(200).json({ success: true, course });
  } catch (err) {
    return handleError(res, err, 'Get course');
  }
};

module.exports = { createCourse, updateCourse, deleteCourse, listCourses, getCourse };