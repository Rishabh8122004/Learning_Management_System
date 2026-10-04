const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    enrolledAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    progress: {
      percentage: { type: Number, default: 0, min: 0, max: 100 },
      // Lesson _ids embedded inside the Course document
      completedLessons: { type: [mongoose.Schema.Types.ObjectId], default: [] },
      lastAccessedLesson: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'enrollments' }
);

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ user: 1 });
enrollmentSchema.index({ course: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);