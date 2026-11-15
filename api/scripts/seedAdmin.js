const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const mongoose = require('mongoose');
const { User } = require('../src/models/User');
const { hashPassword } = require('../src/utils/password');

function fail(message) {
  console.error(`Seed failed: ${message}`);
  process.exit(1);
}

function passwordProblem(password) {
  if (password.length < 12) return 'must be at least 12 characters';
  // bcrypt only reads the first 72 bytes
  if (Buffer.byteLength(password, 'utf8') > 72) return 'must be at most 72 bytes';
  if (!/[a-z]/.test(password)) return 'must contain a lowercase letter';
  if (!/[A-Z]/.test(password)) return 'must contain an uppercase letter';
  if (!/[0-9]/.test(password)) return 'must contain a number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'must contain a special character';
  return null;
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) fail('MONGO_URI is not set in api/.env.');
  if (!email) fail('ADMIN_EMAIL is not set in api/.env.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('ADMIN_EMAIL is not a valid email address.');
  if (!password) fail('ADMIN_PASSWORD is not set in api/.env.');

  const problem = passwordProblem(password);
  if (problem) fail(`ADMIN_PASSWORD ${problem}.`);

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  try {
    const existing = await User.findOne({ email });

    if (existing) {
      console.log(
        existing.role === 'admin'
          ? 'An admin with this email already exists. Nothing changed.'
          : `An account with this email already exists with role "${existing.role}". Nothing changed. Use a different ADMIN_EMAIL.`
      );
      return;
    }

    const passwordHash = await hashPassword(password);
    await User.create({ email, passwordHash, role: 'admin' });
    console.log(`Admin account created for ${email}.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  // the driver can quote the connection string, which contains the password
  const message = String(err.message).replace(/(mongodb(?:\+srv)?:\/\/)[^@\s]*@/gi, '$1<credentials hidden>@');
  fail(message);
});