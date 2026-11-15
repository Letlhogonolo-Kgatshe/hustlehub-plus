const { body, validationResult } = require('express-validator');
const { PUBLIC_ROLES } = require('../models/User');

// bcrypt only reads the first 72 bytes, so anything longer would be silently cut short.
// Bytes, not characters: an emoji alone is 4 bytes.
const MAX_PASSWORD_BYTES = 72;
// keep equal to MIN_LENGTH in client/src/passwordRules.js
const MIN_PASSWORD_LENGTH = 12;
const fitsBcrypt = (value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES;

// one password policy for registration and for changing a password, so the two cannot drift apart
const passwordPolicy = (field, label = 'Password') => body(field)
  .notEmpty().withMessage(`${label} is required`).bail()
  .isString().withMessage(`${label} must be text`).bail()
  .isLength({ min: MIN_PASSWORD_LENGTH }).withMessage(`${label} must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .custom(fitsBcrypt).withMessage(`${label} must be at most ${MAX_PASSWORD_BYTES} bytes (emoji and some letters count as more than one)`)
  .matches(/[a-z]/).withMessage(`${label} must contain a lowercase letter`)
  .matches(/[A-Z]/).withMessage(`${label} must contain an uppercase letter`)
  .matches(/[0-9]/).withMessage(`${label} must contain a number`)
  .matches(/[^A-Za-z0-9]/).withMessage(`${label} must contain a special character`);

const registerRules = [
  body('email')
    .notEmpty().withMessage('Email is required').bail()
    .isString().withMessage('Email must be text').bail()
    .trim()
    .toLowerCase()
    .isEmail().withMessage('Enter a valid email address, like name@example.com'),
  passwordPolicy('password'),
      // admin is deliberately not allowed: admin accounts come from scripts/seedAdmin.js
    body('role')
    .notEmpty().withMessage('Role is required').bail()
    .isString().withMessage('Role must be text').bail()
    .isIn(PUBLIC_ROLES).withMessage(`Role must be one of: ${PUBLIC_ROLES.join(', ')}`),
];

const loginRules = [
  body('email')
    .notEmpty().withMessage('Email is required').bail()
    .isString().withMessage('Email must be text').bail()
    .trim()
    .toLowerCase()
    .isEmail().withMessage('A valid email address is required'),
  body('password')
    .notEmpty().withMessage('Password is required').bail()
    .isString().withMessage('Password must be text').bail()
    .custom(fitsBcrypt).withMessage(`Password must be at most ${MAX_PASSWORD_BYTES} bytes`),
];

const changePasswordRules = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required').bail()
    .isString().withMessage('Current password must be text').bail()
    .custom(fitsBcrypt).withMessage(`Current password must be at most ${MAX_PASSWORD_BYTES} bytes`),
  passwordPolicy('newPassword', 'New password'),
  body('newPassword')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from the current password'),
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map((error) => ({ field: error.path, message: error.msg })),
    });
  }
  return next();
}

module.exports = { registerRules, loginRules, changePasswordRules, validate };
