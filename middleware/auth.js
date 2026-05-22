const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, '..', 'data', 'users.json');

function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const users = readUsers();
    const user = users.find(u => u.id === req.session.userId);
    if (!user || user.isAdmin !== true) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { requireAuth, requireAdmin };