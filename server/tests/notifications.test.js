const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { stub, load, fakeRes, daysFromNow } = require('./helpers');

let seenAt = null;
let saved = null;
let goalFilter = null;
let courseFilter = null;
let role = 'user';
let userFilter = null;
let userFindCalled = false;

stub('models/User', {
  findById: () => ({ select: () => ({ lean: async () => ({ notificationsSeenAt: seenAt, createdAt: daysFromNow(-60), role }) }) }),
  find: (filter) => {
    userFindCalled = true;
    userFilter = filter;
    return {
      select: () => ({
        sort: () => ({
          limit: () => ({
            lean: async () => [
              { _id: 'n1', name: 'Asha', createdAt: daysFromNow(-1) },
              { _id: 'n2', name: 'Ravi', createdAt: daysFromNow(-5) },
            ],
          }),
        }),
      }),
    };
  },
  updateOne: async (filter, update) => {
    saved = update;
  },
});
stub('models/Course', {
  find: (filter) => {
    courseFilter = filter;
    return {
      select: () => ({
        lean: async () => [
          { _id: 'c1', title: 'Brand new', publishedAt: daysFromNow(-1), createdAt: daysFromNow(-5) },
          { _id: 'c2', title: 'Published before publishedAt existed', publishedAt: null, createdAt: daysFromNow(-3) },
          { _id: 'c3', title: 'Last week', publishedAt: daysFromNow(-7), createdAt: daysFromNow(-9) },
        ],
      }),
    };
  },
});
stub('models/Goal', {
  find: (filter) => {
    goalFilter = filter;
    return {
      select: () => ({
        sort: () => ({
          limit: () => ({
            lean: async () => [
              { title: 'Finish React', targetDate: daysFromNow(-2) },
              { title: 'Ship project', targetDate: daysFromNow(0) },
              { title: 'Read book', targetDate: daysFromNow(2) },
            ],
          }),
        }),
      }),
    };
  },
});

const { getNotifications, markSeen } = load('controllers/notificationController');
const { motivationFor, MESSAGES } = load('utils/motivation');

const get = async () => {
  const res = fakeRes();
  await getNotifications({ user: { id: 'u1' } }, res);
  return res;
};

describe('notification list', () => {
  test('deadlines first, then new courses (newest first), then the daily thought', async () => {
    const { body } = await get();
    const types = body.notifications.map((item) => item.type);

    assert.deepEqual(types, ['deadline', 'deadline', 'deadline', 'course', 'course', 'course', 'motivation']);
    assert.match(body.notifications[0].title, /overdue/i);
    assert.match(body.notifications[1].title, /today/i);
    assert.equal(body.notifications[3].message, 'Brand new');
    assert.match(body.notifications[4].message, /before publishedAt existed/);
  });

  test("only the user's own active, unfinished goals and published courses are considered", async () => {
    await get();
    assert.equal(goalFilter.user, 'u1');
    assert.equal(goalFilter.status, 'active');
    assert.equal(goalFilter.completed, false);
    assert.equal(courseFilter.published, true);
    assert.equal(courseFilter.deletedAt, null);
  });

  test('never opened -> everything but the daily thought is unread', async () => {
    seenAt = null;
    const { body } = await get();
    assert.equal(body.unreadCount, 6);
    assert.equal(body.notifications.at(-1).unread, false);
  });

  test('opened just now -> nothing is unread', async () => {
    seenAt = new Date();
    assert.equal((await get()).body.unreadCount, 0);
  });

  test('opened 2 days ago -> deadlines unread again and only the newer course is unread', async () => {
    seenAt = daysFromNow(-2);
    const { body } = await get();
    const unread = body.notifications.filter((item) => item.unread);

    assert.equal(unread.filter((item) => item.type === 'deadline').length, 3);
    assert.equal(unread.filter((item) => item.type === 'course').length, 1);
  });

  test('opening the bell stores one date on the user', async () => {
    const res = fakeRes();
    await markSeen({ user: { id: 'u1' } }, res);
    assert.equal(res.statusCode, 200);
    assert.ok(saved.$set.notificationsSeenAt instanceof Date);
  });
});

describe('admin: new users', () => {
  test('a normal user never sees other people or triggers the lookup', async () => {
    role = 'user';
    userFindCalled = false;
    const { body } = await get();
    assert.equal(userFindCalled, false);
    assert.equal(body.notifications.filter((item) => item.type === 'user').length, 0);
  });

  test('an admin sees who registered recently (names only), excluding themselves', async () => {
    role = 'admin';
    seenAt = daysFromNow(-3);
    const { body } = await get();
    const items = body.notifications.filter((item) => item.type === 'user');

    assert.equal(items.length, 2);
    assert.equal(items[0].message, 'Asha registered');
    assert.equal(items[0].link, '/admin/users');
    assert.equal(items[0].unread, true);
    assert.equal(items[1].unread, false);
    assert.deepEqual(userFilter._id, { $ne: 'u1' });
    assert.deepEqual(userFilter.emailVerified, { $ne: false }, 'unconfirmed sign-ups are not announced');
    assert.ok(userFilter.createdAt.$gte instanceof Date);
    assert.equal(JSON.stringify(body).includes('email'), false);
    role = 'user';
  });
});

describe('daily thought', () => {
  test('is the same all day and the list has no repeats', () => {
    assert.equal(motivationFor(new Date('2026-10-04T01:00:00Z')), motivationFor(new Date('2026-10-04T23:00:00Z')));
    assert.equal(new Set(MESSAGES).size, MESSAGES.length);
  });
});
