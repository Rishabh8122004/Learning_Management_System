// The only shape in which a user is ever returned by the API (never the hash).
const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

module.exports = safeUser;
