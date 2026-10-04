// Small checks that several controllers need, kept in one place.

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// True for a string that looks like a MongoDB id (24 hex characters).
const isValidId = (value) => typeof value === 'string' && OBJECT_ID_REGEX.test(value);

// Makes user-typed text safe to put inside a regular expression, so "c++" is searched as "c++".
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { isValidId, escapeRegex };
