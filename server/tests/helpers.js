// Shared test helpers. Tests never touch a database: models are replaced with
// small stand-ins, and anything not replaced would fail loudly (no connection).
process.env.JWT_SECRET = 'test-secret-not-real';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

const path = require('path');

const root = path.join(__dirname, '..');

// Replace a module (for example a model) before the code under test loads it.
const stub = (relativePath, exportsValue) => {
  const file = require.resolve(path.join(root, relativePath));
  require.cache[file] = { id: file, filename: file, loaded: true, exports: exportsValue };
};

const load = (relativePath) => require(path.join(root, relativePath));

// 24-hex-character ids that look like Mongo ObjectIds.
const hex = (char) => char.repeat(24);

const fakeRes = () => {
  const res = { statusCode: 200 };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

const daysFromNow = (days) => new Date(Date.now() + days * 86400000);
const dayString = (days) => daysFromNow(days).toISOString().slice(0, 10);

const signToken = (payload) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

module.exports = { stub, load, hex, fakeRes, daysFromNow, dayString, signToken };
