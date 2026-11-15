/**
 * One-off helper script: generates a JWT that is already expired by the
 * time you copy it, using the exact same JWT_SECRET your real server uses.
 *
 * Run this from inside your `api` folder (same folder as .env), e.g.:
 *   node generate-expired-token.js
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET not found - make sure you run this from inside your api folder.');
  process.exit(1);
}

// expiresIn: 1 second - by the time you copy/paste this into Postman,
// well over a second will have passed, so it'll already be expired.
const token = jwt.sign(
  { id: 'test-user-id', role: 'user' },
  process.env.JWT_SECRET,
  { expiresIn: 1 }
);

console.log('\nCopy this whole token into your Postman environment as expiredToken:\n');
console.log(token);
console.log('\n(Wait a couple seconds before using it in Postman, just to be safe.)\n');
