const mongoose = require('mongoose');

const isInteger = {
  validator: Number.isInteger,
  message: '{PATH} must be an integer',
};

const isValidUrl = (value) => {
  if (value === null || value === undefined) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
};

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 150 },
  description: { type: String, default: '', trim: true, maxlength: 500 },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
    validate: { validator: isValidUrl, message: 'Lesson link must be a valid http(s) URL' },
  },
  duration: { type: Number, default: 0, min: 0, validate: isInteger }, // minutes
  order: { type: Number, required: true, min: 1, validate: isInteger },
});

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 150 },
  description: { type: String, default: '', trim: true, maxlength: 500 },
  order: { type: Number, required: true, min: 1, validate: isInteger },
  lessons: { type: [lessonSchema], default: [] },
});

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [150, 'Title must be at most 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description must be at most 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      minlength: [2, 'Category must be at least 2 characters'],
      maxlength: [100, 'Category must be at most 100 characters'],
    },
    level: {
      type: String,
      required: [true, 'Level is required'],
      enum: ['beginner', 'intermediate', 'advanced'],
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor is required'],
    },
    thumbnail: {
      type: String,
      default: null,
      trim: true,
      validate: { validator: isValidUrl, message: 'Thumbnail must be a valid URL' },
    },
    modules: { type: [moduleSchema], default: [] },
    tags: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
      validate: [
        {
          validator: (arr) => arr.length <= 20,
          message: 'A course can have at most 20 tags',
        },
        {
          validator: (arr) => arr.every((t) => typeof t === 'string' && t.length > 0),
          message: 'Tags cannot be empty',
        },
        {
          validator: (arr) => new Set(arr).size === arr.length,
          message: 'Tags must be unique within a course',
        },
      ],
    },
    published: { type: Boolean, default: false },
    // Set the first time the course is published (used for "new course" alerts).
    publishedAt: { type: Date, default: null },
    // Soft delete: business logic sets deletedAt = new Date() and published = false
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'courses' }
);

courseSchema.index({ category: 1, level: 1 });
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Course', courseSchema);