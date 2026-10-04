// One short message per day, picked by day of the year (same all day, nothing stored).
const MESSAGES = [
  'Small steps, taken daily, add up to big progress.',
  'Start with ten minutes. Starting is the hardest part.',
  'Progress, not perfection.',
  'Today is a good day to learn one new thing.',
  'Consistency beats intensity.',
  'You do not have to be great to start, but you have to start to be great.',
  'Finish one lesson today and tomorrow will feel easier.',
  'Curiosity is a habit. Feed it a little each day.',
  'Every expert was once a beginner.',
  'Rest is part of learning. Come back refreshed.',
  'Focus on the next step, not the whole staircase.',
  'A goal written down is a goal you can track.',
  'Mistakes are how learning leaves a mark.',
  'Keep going. Your future self is watching.',
  'One focused hour is worth three distracted ones.',
  'You are closer than you were yesterday.',
  'Make it easy to start and hard to skip.',
  'Review what you learned. It sticks better the second time.',
  'Celebrate the small wins. They keep you moving.',
  'Learning is a long road, and you are already on it.',
  'Do a little today. That is how streaks begin.',
  'Ask one good question today.',
  'Teach what you learn. It deepens it.',
  'Slow progress is still progress.',
  'Choose the lesson you have been avoiding.',
  'Your pace is the right pace.',
  'Show up today, even for a few minutes.',
  'Learn something, then use it.',
  'Clarity comes from action.',
  'Great things are built one session at a time.',
];

const dayOfYear = (date) => {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86400000);
};

const motivationFor = (date = new Date()) => MESSAGES[dayOfYear(date) % MESSAGES.length];

module.exports = { motivationFor, MESSAGES };
