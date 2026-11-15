/**
 * Drives the real changePassword() controller. The database, the logger and the
 * config are replaced with small stand-ins, so this needs no MongoDB and no
 * environment file. bcrypt and jsonwebtoken are the real ones.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET = 'a-test-secret-that-is-at-least-thirty-two-characters-long';
process.env.JWT_SECRET = SECRET;

const SRC = path.join(__dirname, '..', 'src');
function stub(relative, exports) {
  const file = require.resolve(path.join(SRC, relative));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
}

// ---- in-memory stand-in for the User model
let docs = [];
let beforeUpdate = null; // lets a test change the stored hash between the read and the write
const copy = (doc) => (doc ? { ...doc } : null);
const query = (get) => ({ select: () => Promise.resolve(get()) });
const find = (id) => docs.find((d) => d._id === id);
function apply(doc, update) {
  if (update.$set) Object.assign(doc, update.$set);
  if (update.$inc) for (const [k, v] of Object.entries(update.$inc)) doc[k] = (doc[k] || 0) + v;
}
const User = {
  findById: (id) => query(() => copy(find(id))),
  updateOne: async (filter, update) => {
    if (beforeUpdate) { const fn = beforeUpdate; beforeUpdate = null; fn(); }
    const d = find(filter._id);
    if (!d || (filter.passwordHash && d.passwordHash !== filter.passwordHash)) return { matchedCount: 0 };
    apply(d, update);
    return { matchedCount: 1 };
  },
  findOneAndUpdate: (filter, update) => query(() => { const d = find(filter._id); if (d) apply(d, update); return copy(d); }),
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

const { changePassword } = require('../src/controllers/passwordController');

const OLD = 'Correct#Passw0rd';
const NEW = 'Brand#New9Passw0rd';
const WRONG = 'Wrong#Passw0rd1';

function fakeResponse() {
  return {
    code: null, body: null, locals: {},
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

async function change(currentPassword, newPassword) {
  const res = fakeResponse();
  let error = null;
  await changePassword(
    { body: { currentPassword, newPassword }, user: { id: 'u1', role: 'freelancer' }, ip: '203.0.113.9' },
    res,
    (e) => { error = e; }
  );
  assert.equal(error, null);
  return res;
}

function freshUser(extra = {}) {
  docs = [{
    _id: 'u1', email: 'freelancer@example.com', role: 'freelancer',
    passwordHash: bcrypt.hashSync(OLD, 4), tokenVersion: 3, failedLoginAttempts: 0, lockUntil: null, ...extra,
  }];
  logged.length = 0;
  beforeUpdate = null;
}

test('a correct current password changes the password and ends older sessions', async () => {
  freshUser();
  const res = await change(OLD, NEW);

  assert.equal(res.code, 200);
  assert.equal(await bcrypt.compare(NEW, docs[0].passwordHash), true, 'the new password works');
  assert.equal(await bcrypt.compare(OLD, docs[0].passwordHash), false, 'the old password no longer works');
  assert.equal(docs[0].tokenVersion, 4, 'tokenVersion is raised, so older tokens are rejected');

  const decoded = jwt.verify(res.body.token, SECRET);
  assert.equal(decoded.id, 'u1');
  assert.equal(decoded.tv, 4, 'the new token matches the new version, so this session stays logged in');
  assert.ok(logged.some(([, event]) => event === 'password_changed'));
});

test('a wrong current password is refused, changes nothing and is counted', async () => {
  freshUser();
  const before = docs[0].passwordHash;
  const res = await change(WRONG, NEW);

  assert.equal(res.code, 400);
  assert.equal(docs[0].passwordHash, before);
  assert.equal(docs[0].tokenVersion, 3);
  assert.equal(docs[0].failedLoginAttempts, 1);
  const entry = logged.find(([, event]) => event === 'password_change_failed');
  assert.equal(entry[2].attempts, 1);
});

test('five wrong current passwords lock the account, and then even the right one is refused', async () => {
  freshUser();
  for (let i = 0; i < 5; i += 1) assert.equal((await change(WRONG, NEW)).code, 400);

  assert.ok(docs[0].lockUntil > new Date(), 'the account is locked');
  assert.ok(logged.some(([, event]) => event === 'account_locked'));

  const before = docs[0].passwordHash;
  const res = await change(OLD, NEW);
  assert.equal(res.code, 423);
  assert.equal(docs[0].passwordHash, before, 'the password was not changed');
  assert.ok(logged.some(([, event]) => event === 'password_change_blocked'));
});

test('a lock that has run out is cleared and the change works', async () => {
  freshUser({ failedLoginAttempts: 0, lockUntil: new Date(Date.now() - 1000) });
  const res = await change(OLD, NEW);
  assert.equal(res.code, 200);
  assert.equal(docs[0].lockUntil, null);
});

test('a successful change resets the failed-attempt counter', async () => {
  freshUser({ failedLoginAttempts: 3 });
  await change(OLD, NEW);
  assert.equal(docs[0].failedLoginAttempts, 0);
});

test('two changes at the same moment cannot both win', async () => {
  freshUser();
  // another request changes the password after this one has checked it
  beforeUpdate = () => { docs[0].passwordHash = bcrypt.hashSync('Other#Passw0rd9', 4); };
  const res = await change(OLD, NEW);
  assert.equal(res.code, 409);
  assert.equal(await bcrypt.compare(NEW, docs[0].passwordHash), false);
});

test('no password reaches the logs', async () => {
  freshUser();
  await change(WRONG, NEW);
  await change(OLD, NEW);
  const text = JSON.stringify(logged);
  for (const secret of [OLD, NEW, WRONG]) assert.equal(text.includes(secret), false);
});
