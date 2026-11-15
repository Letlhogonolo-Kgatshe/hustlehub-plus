const test = require('node:test');
const assert = require('node:assert/strict');
const { clean } = require('../src/utils/logSanitiser');

test('secret fields are redacted, whatever their case or nesting', () => {
  const out = clean({
    password: 'Hunter2!Hunter2!',
    passwordHash: '$2b$12$abc',
    Authorization: 'Bearer abc.def.ghi',
    nested: { jwtSecret: 'x', token: 'y', ok: 'visible' },
    userId: '123',
  });
  assert.equal(out.password, '[redacted]');
  assert.equal(out.passwordHash, '[redacted]');
  assert.equal(out.Authorization, '[redacted]');
  assert.equal(out.nested.jwtSecret, '[redacted]');
  assert.equal(out.nested.token, '[redacted]');
  assert.equal(out.nested.ok, 'visible');
  assert.equal(out.userId, '123');
});

test('line breaks are removed so a value cannot forge a log line', () => {
  const out = clean({ email: 'a@b.com\n{"level":"info","message":"login_success"}\r\n' });
  assert.ok(!/[\r\n]/.test(out.email));
});

test('database credentials inside a connection string are hidden', () => {
  const out = clean({ error: 'connect failed: mongodb://app:SuperSecret@127.0.0.1:27017/hustlehub' });
  assert.ok(!out.error.includes('SuperSecret'));
  assert.ok(out.error.includes('<credentials hidden>'));
});

test('long strings and deep objects are cut down', () => {
  assert.equal(clean({ note: 'x'.repeat(5000) }).note.length, 300);
  const deep = { a: { b: { c: { d: { e: 'too deep' } } } } };
  assert.equal(clean(deep).a.b.c.d, '[truncated]');
});

test('an Error becomes its message only', () => {
  const out = clean({ error: new Error('boom') });
  assert.equal(out.error, 'boom');
});
