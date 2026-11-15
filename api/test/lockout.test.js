const test = require('node:test');
const assert = require('node:assert/strict');
const { isLocked, lockExpired, shouldLock, lockUntilDate } = require('../src/utils/lockout');

const NOW = Date.parse('2026-11-09T10:00:00Z');

test('an account with no lock is not locked', () => {
  assert.equal(isLocked({ lockUntil: null }, NOW), false);
  assert.equal(isLocked({}, NOW), false);
  assert.equal(lockExpired({ lockUntil: null }, NOW), false);
});

test('an account is locked until the lock time passes', () => {
  const until = new Date(NOW + 60_000);
  assert.equal(isLocked({ lockUntil: until }, NOW), true);
  assert.equal(isLocked({ lockUntil: until }, NOW + 60_000), false); // exactly at the end it is open again
  assert.equal(lockExpired({ lockUntil: until }, NOW + 60_001), true);
});

test('the lock starts at the configured number of failures, not before', () => {
  assert.equal(shouldLock(4, 5), false);
  assert.equal(shouldLock(5, 5), true);
  assert.equal(shouldLock(6, 5), true);
});

test('the lock lasts for the configured time', () => {
  assert.equal(lockUntilDate(15 * 60 * 1000, NOW).getTime(), NOW + 900_000);
});
