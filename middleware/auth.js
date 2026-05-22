const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = { requireAuth, requireAdmin };