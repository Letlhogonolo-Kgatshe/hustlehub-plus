/**
 * userController.js
 *
 * Admin-only view of the registered accounts.
 *
 * Security notes:
 *   - The query selects only email, role and createdAt, so the password
 *     hash is never loaded, on top of the model's select:false.
 *   - Each user is mapped to a fixed shape (id, email, role, createdAt),
 *     so a field added to the User model later is not exposed by accident.
 *   - Results are paged, so one request never returns every account.
 */

const { User } = require('../models/User');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// GET /api/users?page=1&limit=20  (admin)
async function listUsers(req, res, next) {
  try {
    const pageNumber = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    const [users, total] = await Promise.all([
      User.find({}, 'email role createdAt')
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      User.countDocuments(),
    ]);

    return res.status(200).json({
      users: users.map((u) => ({
        id: String(u._id),
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      })),
      page: pageNumber,
      limit: pageSize,
      total,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listUsers };
