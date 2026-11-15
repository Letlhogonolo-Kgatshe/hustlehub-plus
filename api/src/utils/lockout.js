/**
 * lockout.js
 *
 * The decisions behind the per-account login lockout. They are small pure
 * functions so they can be tested without a database; authController.js does
 * the reading and writing.
 *
 * Policy (set in config/env.js): after LOCKOUT_MAX_ATTEMPTS failed logins in a row
 * the account is locked for LOCKOUT_MINUTES. A successful login, or a lock that
 * has run out, starts the count again from zero.
 */

function lockTime(user) {
  return user.lockUntil ? new Date(user.lockUntil).getTime() : null;
}

// true while the lock has not yet run out
function isLocked(user, now = Date.now()) {
  const until = lockTime(user);
  return until !== null && until > now;
}

// true when there is a lock whose time has passed and still needs clearing
function lockExpired(user, now = Date.now()) {
  const until = lockTime(user);
  return until !== null && until <= now;
}

function shouldLock(failedAttempts, maxAttempts) {
  return failedAttempts >= maxAttempts;
}

function lockUntilDate(durationMs, now = Date.now()) {
  return new Date(now + durationMs);
}

module.exports = { isLocked, lockExpired, shouldLock, lockUntilDate };
