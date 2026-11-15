/**
 * authRoutes.js
 *
 * Defines the authentication endpoints for HustleHub+ and wires each one
 * through its validation rules before reaching the controller.
 *
 * Purpose:
 *   Keeps route definitions declarative and centralised: each endpoint's
 *   full middleware chain (validation -> controller) is visible in one
 *   place, rather than assembled ad-hoc in app.js.
 *
 * How it fits into the request flow:
 *   Client -> validation rules (validators.js) -> validate() -> controller (authController.js) -> Client
 */

const express = require('express');
const { register, login, logout } = require('../controllers/authController');
const { changePassword } = require('../controllers/passwordController');
const { registerRules, loginRules, changePasswordRules, validate } = require('../middleware/validators');
const { authLimiter } = require('../middleware/rateLimiters');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/register
router.post('/api/register', authLimiter, registerRules, validate, register);

// POST /api/login
router.post('/api/login', authLimiter, loginRules, validate, login);

// POST /api/logout: ends all of this user's sessions on the server
router.post('/api/logout', requireAuth, logout);

// POST /api/change-password: needs the current password, ends every other session
router.post('/api/change-password', authLimiter, requireAuth, changePasswordRules, validate, changePassword);

module.exports = router;