/**
 * The password rules used when changing a password, and the sanitiser that
 * must leave password fields exactly as typed.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const { registerRules, changePasswordRules } = require('../src/middleware/validators');
const { sanitise } = require('../src/middleware/sanitise');

async function errorsFor(rules, body) {
  const req = { body };
  await Promise.all(rules.map((rule) => rule.run(req)));
  return validationResult(req).array().map((e) => `${e.path}: ${e.msg}`);
}

const CURRENT = 'Correct#Passw0rd';
const change = (newPassword, currentPassword = CURRENT) => errorsFor(changePasswordRules, { currentPassword, newPassword });

test('a strong new password is accepted', async () => {
  assert.deepEqual(await change('Brand#New9Passw0rd'), []);
});

test('weak new passwords are rejected, each with its own reason', async () => {
  assert.match((await change('Sh0rt#pw')).join(), /at least 12 characters/);
  assert.match((await change('nouppercase#9passwordx')).join(), /uppercase/);
  assert.match((await change('NOLOWERCASE#9PASSWORDX')).join(), /lowercase/);
  assert.match((await change('NoNumbers#Passwordxx')).join(), /number/);
  assert.match((await change('NoSpecial9Passwordxx')).join(), /special character/);
  assert.match((await change('A#1' + 'a'.repeat(80))).join(), /at most 72 bytes/);
});

test('the new password must differ from the current one', async () => {
  assert.match((await change(CURRENT)).join(), /different from the current password/);
});

test('missing or non-text fields are rejected (no objects sneaking in)', async () => {
  assert.ok((await errorsFor(changePasswordRules, {})).length >= 2);
  assert.ok((await change({ $ne: null })).length > 0);
  assert.ok((await change('Brand#New9Passw0rd', { $ne: null })).length > 0);
});

test('registration and password change accept and reject the same passwords', async () => {
  const samples = ['Brand#New9Passw0rd', 'Sh0rt#pw', 'nouppercase#9passwordx', 'NOLOWERCASE#9PASSWORDX',
    'NoNumbers#Passwordxx', 'NoSpecial9Passwordxx', 'A#1' + 'a'.repeat(80)];
  for (const pw of samples) {
    const reg = await errorsFor(registerRules, { email: 'a@example.com', password: pw, role: 'client' });
    const chg = await change(pw, 'Other#Current9Pass');
    assert.equal(reg.length === 0, chg.length === 0, `same verdict for ${pw.slice(0, 12)}`);
  }
});

test('the sanitiser leaves passwords exactly as typed, including angle brackets', () => {
  const req = { body: { currentPassword: 'a<b>#Passw0rd1', newPassword: 'x<script>#Passw0rd9', note: '<b>hi</b>' }, query: {} };
  sanitise(req, {}, () => {});
  assert.equal(req.body.currentPassword, 'a<b>#Passw0rd1');
  assert.equal(req.body.newPassword, 'x<script>#Passw0rd9');
  assert.equal(req.body.note, 'hi', 'other fields are still cleaned');
});
