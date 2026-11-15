/**
 * Drives the real login() controller through the lockout flow. The database, the
 * logger and the config are replaced with small stand-ins, so this needs no
 * MongoDB and no environment file. bcrypt and jsonwebtoken are the real ones.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const bcrypt = require('bcrypt');

process.env.JWT_SECRET = 'a-test-secret-that-is-at-least-thirty-two-characters-long';

const SRC = path.join(__dirname, '..', 'src');
function stub(relative, exports) {
  const file = require.resolve(path.join(SRC, relative));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
}

// ---- in-memory stand-in for the User model
let docs = [];
const copy = (doc) => (doc ? { ...doc } : null);
const query = (get) => ({ select: () => Promise.resolve(get()) });
const find = (filter) => docs.find((d) => (filter.email ? d.email === filter.email : d._id === filter._id));
function apply(doc, update) {
  if (update.$set) Object.assign(doc, update.$set);
  if (update.$inc) for (const [k, v] of Object.entries(update.$inc)) doc[k] = (doc[k] || 0) + v;
}
const User = {
  findOne: (filter) => query(() => copy(find(filter))),
  updateOne: async (filter, update) => { const d = find(filter); if (d) apply(d, update); },
  findOneAndUpdate: (filter, update) => query(() => { const d = find(filter); if (d) apply(d, update); return copy(d); }),
};

const logged = [];
const logger = {
  info: (event, fields) => logged.push(['info', event, fields]),
  warn: (event, fields) => logged.push(['warn', event, fields]),
  error: (event, fields) => logged.push(['error', event, fields]),
};

stub('models/User.js', { User });
stub('utils/logger.js', logger);
stub('config/env.js', { config: { lockout: { maxAttempts: 5, durationMs: 15 * 60 * 1000 } } });

const { login } = require('../src/controllers/authController');

const GOOD = 'Correct#Passw0rd';
const BAD = 'Wrong#Passw0rd1';

function fakeResponse() {
  return {
    code: null, body: null, locals: {},
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

async function attempt(email, password) {
  const res = fakeResponse();
  let error = null;
  await login({ body: { email, password }, ip: '203.0.113.9' }, res, (e) => { error = e; });
  assert.equal(error, null);
  return res;
}

function freshUser() {
  docs = [{
    _id: 'u1', email: 'freelancer@example.com', role: 'freelancer',
    passwordHash: bcrypt.hashSync(GOOD, 4), tokenVersion: 0, failedLoginAttempts: 0, lockUntil: null,
  }];
  logged.length = 0;
}

test('five wrong passwords lock the account, and then even the right password is refused', async () => {
  freshUser();
  for (let i = 1; i <= 5; i += 1) {
    const res = await attempt('freelancer@example.com', BAD);
    assert.equal(res.code, 401);
  }
  assert.ok(docs[0].lockUntil > new Date(), 'lockUntil is in the future');
  assert.ok(logged.some(([, event]) => event === 'account_locked'));

  const res = await attempt('freelancer@example.com', GOOD);
  assert.equal(res.code, 401);
  assert.equal(res.body.token, undefined);
  assert.ok(logged.some(([, event]) => event === 'login_blocked'));
});

test('four wrong passwords do not lock the account', async () => {
  freshUser();
  for (let i = 0; i < 4; i += 1) await attempt('freelancer@example.com', BAD);
  assert.equal(docs[0].lockUntil, null);
  const res = await attempt('freelancer@example.com', GOOD);
  assert.equal(res.code, 200);
});

test('unknown email, wrong password and locked account all give the same answer', async () => {
  freshUser();
  const unknown = await attempt('nobody@example.com', GOOD);
  const wrong = await attempt('freelancer@example.com', BAD);
  for (let i = 0; i < 4; i += 1) await attempt('freelancer@example.com', BAD);
  const locked = await attempt('freelancer@example.com', GOOD);
  assert.deepEqual([unknown.code, wrong.code, locked.code], [401, 401, 401]);
  assert.deepEqual(unknown.body, wrong.body);
  assert.deepEqual(wrong.body, locked.body);
});

test('bcrypt runs for an unknown email and for a locked account, so timing does not give them away', async () => {
  freshUser();
  const original = bcrypt.compare;
  let compares = 0;
  bcrypt.compare = (...args) => { compares += 1; return original(...args); };
  try {
    await attempt('nobody@example.com', GOOD);
    assert.equal(compares, 1);
    docs[0].lockUntil = new Date(Date.now() + 60_000);
    await attempt('freelancer@example.com', GOOD);
    assert.equal(compares, 2);
  } finally {
    bcrypt.compare = original;
  }
});

test('once the lock has run out the right password works and the counters reset', async () => {
  freshUser();
  docs[0].failedLoginAttempts = 0;
  docs[0].lockUntil = new Date(Date.now() - 1000); // expired a second ago
  const res = await attempt('freelancer@example.com', GOOD);
  assert.equal(res.code, 200);
  assert.ok(res.body.token);
  assert.equal(docs[0].lockUntil, null);
  assert.equal(docs[0].failedLoginAttempts, 0);
});

test('a successful login clears earlier failures, so the count starts again', async () => {
  freshUser();
  for (let i = 0; i < 3; i += 1) await attempt('freelancer@example.com', BAD);
  assert.equal(docs[0].failedLoginAttempts, 3);
  assert.equal((await attempt('freelancer@example.com', GOOD)).code, 200);
  assert.equal(docs[0].failedLoginAttempts, 0);
  for (let i = 0; i < 4; i += 1) await attempt('freelancer@example.com', BAD);
  assert.equal(docs[0].lockUntil, null, 'four failures after a success must not lock');
});

test('passwords and tokens never appear in the log calls', async () => {
  freshUser();
  await attempt('freelancer@example.com', BAD);
  await attempt('freelancer@example.com', GOOD);
  const text = JSON.stringify(logged);
  assert.ok(!text.includes(BAD) && !text.includes(GOOD));
  assert.ok(!/eyJ[A-Za-z0-9_-]+\./.test(text), 'no JWT in the logs');
  assert.ok(logged.some(([, event]) => event === 'login_success'));
});
