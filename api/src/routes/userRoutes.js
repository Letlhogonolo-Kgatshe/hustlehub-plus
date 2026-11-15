/**
 * userRoutes.js
 *
 * Request flow:
 *   Client -> requireAuth (401) -> requireRole('admin') (403) -> controller
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { listUsers } = require('../controllers/userController');

const router = express.Router();

// admin only: every account without the password hash
router.get('/api/users', requireAuth, requireRole('admin'), listUsers);

module.exports = router;
