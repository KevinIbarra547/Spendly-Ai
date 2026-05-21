/**
 * Auth middleware stubs — fleshed out in CP02 and CP09.
 *
 * requireAuth: will check req.session.userId and return 401 if missing.
 *   Once implemented, any route that requires a logged-in user should use this.
 *
 * requireAdmin: will additionally check that the user flagged as isAdmin
 *   exists in users.json. Any admin-only route should use this after requireAuth.
 *
 * For now both stubs simply call next() so placeholder routes work immediately.
 */

module.exports = {
  requireAuth: (req, res, next) => next(),
  requireAdmin: (req, res, next) => next()
};
