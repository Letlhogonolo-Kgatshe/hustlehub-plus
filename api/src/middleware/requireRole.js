/**
 * requireRole.js
 *
 * Role-based access control. Must run AFTER requireAuth, because it reads
 * req.user.role, which requireAuth sets from the verified token.
 *
 * Usage: router.post('/api/gigs', requireAuth, requireRole('freelancer'), ...)
 *
 * No token -> 401 (handled by requireAuth). Wrong role -> 403.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Authentication Required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that' });
    }
    return next();
  };
}

module.exports = { requireRole };