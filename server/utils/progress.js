const Enrollment = require('../models/Enrollment');

// Percentage rules shared by lesson toggling and course edits:
// 100 only when every lesson is done, otherwise capped at 99.
const computeProgress = (completedIds, lessonIds) => {
  const total = lessonIds.size;
  const done = completedIds.filter((id) => lessonIds.has(id)).length;

  let percentage = 0;
  if (total > 0) {
    percentage = done >= total ? 100 : Math.min(99, Math.round((done / total) * 100));
  }

  return { percentage, isComplete: total > 0 && done >= total };
};

const lessonIdsOf = (course) =>
  new Set(course.modules.flatMap((module) => module.lessons.map((lesson) => String(lesson._id))));

// After a course's lessons change, bring every enrollment back in line with the
// CURRENT lessons: drop stale lesson ids, recompute percentage and status.
// Returns how many enrollments were updated.
const recomputeEnrollmentProgress = async (course) => {
  const lessonIds = lessonIdsOf(course);
  const enrollments = await Enrollment.find({ course: course._id })
    .select('progress status completedAt')
    .lean();

  const operations = [];
  for (const enrollment of enrollments) {
    const stored = enrollment.progress.completedLessons.map(String);
    const valid = stored.filter((id) => lessonIds.has(id));
    const { percentage, isComplete } = computeProgress(valid, lessonIds);
    const status = isComplete ? 'completed' : 'active';

    const unchanged =
      valid.length === stored.length &&
      percentage === enrollment.progress.percentage &&
      status === enrollment.status;
    if (unchanged) continue;

    operations.push({
      updateOne: {
        filter: { _id: enrollment._id },
        update: {
          $set: {
            'progress.completedLessons': valid,
            'progress.percentage': percentage,
            status,
            completedAt: isComplete ? enrollment.completedAt || new Date() : null,
          },
        },
      },
    });
  }

  if (operations.length) await Enrollment.bulkWrite(operations);
  return operations.length;
};

module.exports = { computeProgress, lessonIdsOf, recomputeEnrollmentProgress };
