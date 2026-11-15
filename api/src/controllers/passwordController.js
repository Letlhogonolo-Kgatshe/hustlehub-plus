/**
 * passwordController.js
 *
 * Lets a logged-in user change their own password.
 *
 * Security notes:
 *   - The current password is required, so a stolen token alone cannot take over
 *     the account. Wrong current passwords count towards the same per-account
 *     lockout as wrong logins (utils/lockout.js), so this endpoint cannot be used
 *     to guess the password without limit. While the account is locked the
 *     change is refused even if the current password is right.
 *   - The new password must pass the registration policy and differ from the
 *     current one (middleware/validators.js).
 *   - A successful change raises tokenVersion, so every token issued before it,
 *     including a stolen one, stops working. The caller receives a fresh token and
 *     stays logged in on this device.
 *   - The write only succeeds if the stored hash is still the one that was checked,
 *     so two changes at the same moment cannot both win.
 *   - Passwords and tokens never reach the logs.
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { hashPassword, verifyPassword } = require('../utils/password');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const { isLocked, lockExpired, shouldLock, lockUntilDate } = require('../utils/lockout');

const WRONG_PASSWORD_MESSAGE = 'Current password is incorrect';
const LOCKED_MESSAGE = 'Too many failed attempts. Try again later.';
const JWT_EXPIRES_IN = '1h'; // keep equal to authController.js

/**
 * POST /api/change-password  (logged in)
 * Expects { currentPassword, newPassword }.
 * Responds 200 { message, token }, 400 (wrong current password), 409 (changed at the same moment)
 * or 423 (account locked after too many failures).
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id)
      .select('+passwordHash +tokenVersion +failedLoginAttempts +lockUntil');
    if (!user) return res.status(401).json({ error: 'Authentication Required' });

    // a lock that has run out is cleared, so the count starts again from zero
    if (lockExpired(user)) {
      await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0, lockUntil: null } });
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }

    const currentMatches = await verifyPassword(currentPassword, user.passwordHash);
    const userId = String(user._id);

    if (isLocked(user)) {
      logger.warn('password_change_blocked', { reason: 'account_locked', userId, ip: req.ip });
      res.locals.skipRequestLog = true;
      return res.status(423).json({ error: LOCKED_MESSAGE });
    }

    if (!currentMatches) {
      // same atomic counter and limit as login
      const updated = await User.findOneAndUpdate(
        { _id: user._id },
        { $inc: { failedLoginAttempts: 1 } },
        { new: true }
      ).select('+failedLoginAttempts');

      const attempts = updated ? updated.failedLoginAttempts : 0;
      logger.warn('password_change_failed', { reason: 'wrong_current_password', userId, attempts, ip: req.ip });

      if (updated && shouldLock(attempts, config.lockout.maxAttempts)) {
        await User.updateOne(
          { _id: user._id },
          { $set: { lockUntil: lockUntilDate(config.lockout.durationMs), failedLoginAttempts: 0 } }
        );
        logger.warn('account_locked', {
          userId,
          minutes: Math.round(config.lockout.durationMs / 60000),
          ip: req.ip,
        });
      }

      res.locals.skipRequestLog = true;
      return res.status(400).json({ error: WRONG_PASSWORD_MESSAGE });
    }

    const newHash = await hashPassword(newPassword);

    // only succeeds if nobody changed the password since it was checked above
    const result = await User.updateOne(
      { _id: user._id, passwordHash: user.passwordHash },
      {
        $set: { passwordHash: newHash, failedLoginAttempts: 0, lockUntil: null },
        $inc: { tokenVersion: 1 },
      }
    );
    if (!result || !result.matchedCount) {
      res.locals.skipRequestLog = true;
      return res.status(409).json({ error: 'The password was changed by another request. Try again.' });
    }

    const token = jwt.sign(
      { id: userId, role: user.role, tv: (user.tokenVersion || 0) + 1 },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info('password_changed', { userId, ip: req.ip });
    return res.status(200).json({ message: 'Password changed', token });
  } catch (err) {
    return next(err);
  }
}

module.exports = { changePassword };
