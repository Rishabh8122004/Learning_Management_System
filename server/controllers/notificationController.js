const Course = require('../models/Course');
const Goal = require('../models/Goal');
const User = require('../models/User');
const { motivationFor } = require('../utils/motivation');

const DAY = 24 * 60 * 60 * 1000;
const NEW_COURSE_DAYS = 14;
const NEW_USER_DAYS = 14;
const DEADLINE_DAYS = 3;

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const dayString = (date) => date.toISOString().slice(0, 10);

const deadlineText = (targetDate, now) => {
  const days = Math.round((Date.parse(dayString(targetDate)) - Date.parse(dayString(now))) / DAY);
  if (days < 0) return { title: 'Goal overdue', when: `Was due ${dayString(targetDate)}` };
  if (days === 0) return { title: 'Goal due today', when: 'Due today' };
  if (days === 1) return { title: 'Goal due tomorrow', when: 'Due tomorrow' };
  return { title: 'Goal due soon', when: `Due in ${days} days` };
};

// GET /api/notifications
// Nothing is stored per notification: the list is worked out from courses and goals
// each time. The only thing saved is when the user last opened the bell.
// Admins also see people who registered recently (computed from User.createdAt, nothing extra is stored).
const getNotifications = async (req, res) => {
  try {
    const now = new Date();
    const user = await User.findById(req.user.id).select('notificationsSeenAt createdAt role').lean();
    if (!user) return fail(res, 401, 'Invalid or expired token');

    const seenAt = user.notificationsSeenAt || user.createdAt;
    const startOfToday = new Date(`${dayString(now)}T00:00:00.000Z`);
    const since = new Date(now.getTime() - NEW_COURSE_DAYS * DAY);
    const deadlineLimit = new Date(now.getTime() + DEADLINE_DAYS * DAY);

    const isAdmin = user.role === 'admin';
    const newUserSince = new Date(now.getTime() - NEW_USER_DAYS * DAY);

    const [courses, goals, newUsers] = await Promise.all([
      // Courses published before publishedAt existed fall back to createdAt.
      Course.find({
        published: true,
        deletedAt: null,
        $or: [
          { publishedAt: { $gte: since } },
          { publishedAt: null, createdAt: { $gte: since } },
        ],
      })
        .select('title publishedAt createdAt')
        .lean(),
      Goal.find({
        user: req.user.id,
        status: 'active',
        completed: false,
        targetDate: { $ne: null, $lte: deadlineLimit },
      })
        .select('title targetDate')
        .sort({ targetDate: 1 })
        .limit(10)
        .lean(),
      isAdmin
        ? User.find({ _id: { $ne: req.user.id }, createdAt: { $gte: newUserSince } })
            .select('name createdAt')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean()
        : [],
    ]);

    // Deadlines count as unread until the bell has been opened today.
    const deadlineUnread = seenAt < startOfToday;

    const deadlineItems = goals.map((goal) => {
      const { title, when } = deadlineText(goal.targetDate, now);
      return {
        type: 'deadline',
        title,
        message: `${goal.title} · ${when}`,
        link: '/goals',
        createdAt: goal.targetDate,
        unread: deadlineUnread,
      };
    });

    const courseItems = courses
      .map((course) => ({ course, at: course.publishedAt || course.createdAt }))
      .sort((a, b) => b.at - a.at)
      .slice(0, 5)
      .map(({ course, at }) => ({
        type: 'course',
        title: 'New course',
        message: course.title,
        link: `/courses/${course._id}`,
        createdAt: at,
        unread: at > seenAt,
      }));

    const userItems = newUsers.map((person) => ({
      type: 'user',
      title: 'New user',
      message: `${person.name} registered`,
      link: '/admin/users',
      createdAt: person.createdAt,
      unread: person.createdAt > seenAt,
    }));

    const motivation = {
      type: 'motivation',
      title: 'Today’s thought',
      message: motivationFor(now),
      link: null,
      createdAt: startOfToday,
      unread: false,
    };

    const notifications = [...deadlineItems, ...userItems, ...courseItems, motivation];

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount: notifications.filter((item) => item.unread).length,
    });
  } catch (err) {
    console.error('Get notifications error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

// POST /api/notifications/seen
const markSeen = async (req, res) => {
  try {
    await User.updateOne({ _id: req.user.id }, { $set: { notificationsSeenAt: new Date() } });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Mark notifications seen error:', err.message);
    return fail(res, 500, 'Server error');
  }
};

module.exports = { getNotifications, markSeen };
