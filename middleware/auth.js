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

// Must be called after requireAuth — assumes req.session.userId exists.
function requireParent(req, res, next) {
  try {
    const users = readUsers();
    const user = users.find(u => u.id === req.session.userId);
    if (!user || user.role !== 'parent') {
      return res.status(403).json({ error: 'Parent account required.' });
    }
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Must be called after requireAuth — assumes req.session.userId exists.
function requireChild(req, res, next) {
  try {
    const users = readUsers();
    const user = users.find(u => u.id === req.session.userId);
    if (!user || user.role !== 'child') {
      return res.status(403).json({ error: 'Child account required.' });
    }
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

const DEMO_IDS = [
  'demo-user-001',
  'demo-parent-001',
  'demo-child-001',
  'demo-admin-001'
];

// Mounted at app.use('/api', demoModeGuard) — runs before any route handler.
// For demo accounts only, swallows writes and returns a fake-success body so
// the UI feels real without persisting to the JSON files.
function demoModeGuard(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }
  if (!req.session || !req.session.userId) return next();
  if (!DEMO_IDS.includes(req.session.userId)) return next();

  // NB: this middleware is mounted under /api, so req.path inside the
  // handler has the /api prefix stripped (e.g. /auth/logout, /ai/coach).
  // Whitelist logout so demo users can sign out.
  if (req.path === '/auth/logout') return next();

  // Whitelist AI routes — coach and scanner don't write user data
  // and are the most impressive features to demo.
  if (req.path.includes('/ai/')) return next();

  console.log(`[DEMO MODE] Blocked write: ${req.method} ${req.path}`);

  if (req.method === 'DELETE') return res.status(204).end();

  const fakeResponse = {
    ...req.body,
    id: (req.body && req.body.id) || (req.params && req.params.id) || 'demo_' + Date.now(),
    userId: req.session.userId,
    _demoMode: true
  };
  return res.status(req.method === 'POST' ? 201 : 200).json(fakeResponse);
}

module.exports = { requireAuth, requireAdmin, requireParent, requireChild, demoModeGuard };