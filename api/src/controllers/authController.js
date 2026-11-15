/**
 * authController.js
 * Author:
 * Funi
 *
 * Handles user registration and login for HustleHub+.
 *
 * Purpose:
 *   register() creates a new user with a securely hashed password.
 *   login() verifies credentials against stored (hashed) data and, if
 *   valid, issues a signed JWT the client uses to authenticate
 *   subsequent requests via the requireAuth middleware (see auth.js).
 *
 * How it fits into the request flow:
 *   Client -> validate() middleware (registerRules / loginRules) -> this file -> Client
 *
 * Security notes:
 *   - Passwords are never stored or compared as plain text. hashPassword
 *     (register) and verifyPassword (login) both go through bcrypt.
 *   - login()'s failure response is deliberately identical whether the
 *     email doesn't exist or the password is wrong, to prevent user
 *     enumeration. It also takes the same time: for an unknown email the
 *     password is still checked with bcrypt, against a throwaway hash made
 *     once at start-up, so the response time does not reveal the account.
 *   - register()'s duplicate-email response uses the same generic
 *     message shape as login() failures, for the same reason.
 *   - The JWT payload contains only non-sensitive identifying fields
 *     (id, role) -- JWT payloads are base64-encoded, not encrypted, and
 *     readable by anyone holding the token.
 *   - Tokens are short-lived (see JWT_EXPIRES_IN) to limit the window
 *     during which a stolen token remains usable.
 *   - Per-account lockout: LOCKOUT_MAX_ATTEMPTS wrong passwords in a row lock
 *     the account for LOCKOUT_MINUTES (see utils/lockout.js). A locked account
 *     gets the same 401 as any other failed login, and bcrypt still runs, so
 *     neither the response nor its timing reveals that the account exists or
 *     is locked. The counter is raised with an atomic $inc, so parallel
 *     guesses cannot slip past it.
 *   - Login, registration and logout events are logged (see utils/logger.js).
 *     Passwords and tokens never reach the logs.
 */


const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { hashPassword, verifyPassword } = require('../utils/password');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const { isLocked, lockExpired, shouldLock, lockUntilDate } = require('../utils/lockout');

const DUPLICATE_EMAIL_MESSAGE = 'An account with this email already exists';
const INVALID_LOGIN_MESSAGE = 'Invalid email or password';
const JWT_EXPIRES_IN = '1h';

// hashed once at start-up with the same cost as real passwords; login compares
// against it when the email is unknown, so both cases take the same time
const DUMMY_HASH = hashPassword(crypto.randomBytes(32).toString('hex'));
DUMMY_HASH.catch(() => {}); // a failure surfaces when login awaits it

/**
 * POST /api/register
 * Expects { email, password, role } where role is client or freelancer
 * (validators.js rejects anything else, including admin).
 * Responds 201 { message, user: { id, email, role, createdAt } } or 409 { message }.
 */
async function register(req, res, next) {
  try {
    const { email, password, role } = req.body;

    // checked first so the common case skips the slow bcrypt hash
    if (await User.exists({ email })) {
      logger.info('registration_rejected', { reason: 'duplicate_email', ip: req.ip });
      return res.status(409).json({ message: DUPLICATE_EMAIL_MESSAGE });
    }

    const passwordHash = await hashPassword(password);

    let user;
    try {
      user = await User.create({ email, passwordHash, role });
    } catch (err) {
      // two requests with the same email can both pass the check above;
      // the unique index catches the second one
      if (err && err.code === 11000) {
        logger.info('registration_rejected', { reason: 'duplicate_email', ip: req.ip });
        return res.status(409).json({ message: DUPLICATE_EMAIL_MESSAGE });
      }
      throw err;
    }

    logger.info('user_registered', { userId: String(user._id), role: user.role, ip: req.ip });

    return res.status(201).json({
      message: 'Registration successful',
      user: { id: String(user._id), email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/login
 * Responds 200 { token, user: { id, email, role } } or 401 { error } on any failure,
 * including a locked account.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // select:false fields have to be asked for here
    const user = await User.findOne({ email })
      .select('+passwordHash +tokenVersion +failedLoginAttempts +lockUntil');

    // Deliberately generic: same response whether the user doesn't exist,
    // the password is wrong or the account is locked.
    if (!user) {
      await verifyPassword(password, await DUMMY_HASH);
      logger.warn('login_failed', { reason: 'unknown_email', email, ip: req.ip });
      res.locals.skipRequestLog = true;
      return res.status(401).json({ error: INVALID_LOGIN_MESSAGE });
    }

    // a lock that has run out is cleared, so the count starts again from zero
    if (lockExpired(user)) {
      await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0, lockUntil: null } });
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }

    // bcrypt runs before the lock is checked, so a locked account takes as long as any other
    const passwordMatches = await verifyPassword(password, user.passwordHash);

    if (isLocked(user)) {
      logger.warn('login_blocked', { reason: 'account_locked', userId: String(user._id), ip: req.ip });
      res.locals.skipRequestLog = true;
      return res.status(401).json({ error: INVALID_LOGIN_MESSAGE });
    }

    if (!passwordMatches) {
      // atomic increment: two parallel wrong guesses are both counted
      const updated = await User.findOneAndUpdate(
        { _id: user._id },
        { $inc: { failedLoginAttempts: 1 } },
        { new: true }
      ).select('+failedLoginAttempts');

      const attempts = updated ? updated.failedLoginAttempts : 0;
      logger.warn('login_failed', { reason: 'wrong_password', userId: String(user._id), attempts, ip: req.ip });

      if (updated && shouldLock(attempts, config.lockout.maxAttempts)) {
        await User.updateOne(
          { _id: user._id },
          { $set: { lockUntil: lockUntilDate(config.lockout.durationMs), failedLoginAttempts: 0 } }
        );
        logger.warn('account_locked', {
          userId: String(user._id),
          minutes: Math.round(config.lockout.durationMs / 60000),
          ip: req.ip,
        });
      }

      res.locals.skipRequestLog = true;
      return res.status(401).json({ error: INVALID_LOGIN_MESSAGE });
    }

    // a correct password ends any run of failures
    if (user.failedLoginAttempts || user.lockUntil) {
      await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0, lockUntil: null } });
    }

    // tv lets a logout end every token issued before it (see requireAuth)
    const payload = { id: String(user._id), role: user.role, tv: user.tokenVersion || 0 };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    logger.info('login_success', { userId: String(user._id), role: user.role, ip: req.ip });

    return res.status(200).json({
      token,
      user: { id: String(user._id), email: user.email, role: user.role },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/logout  (logged in)
 * Ends every session of this user on the server by raising tokenVersion,
 * so tokens issued before now are rejected even though they have not expired.
 * Responds 200 { message }.
 */
async function logout(req, res, next) {
  try {
    await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });
    logger.info('logout', { userId: req.user.id, ip: req.ip });
    return res.status(200).json({ message: 'Logged out' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, logout };