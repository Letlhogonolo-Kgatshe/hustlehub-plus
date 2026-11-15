const { rateLimit } = require('express-rate-limit');
const { config } = require('../config/env');

function buildLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      const resetTime = req.rateLimit && req.rateLimit.resetTime;
      const retryAfter = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : Math.ceil(windowMs / 1000);

      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({ message, retryAfter });
    },
  });
}

const authLimiter = buildLimiter({
  windowMs: config.authRateLimit.windowMs,
  limit: config.authRateLimit.limit,
  message: 'Too many login or registration attempts. Please wait and try again.',
});

const bookingLimiter = buildLimiter({
  windowMs: config.bookingRateLimit.windowMs,
  limit: config.bookingRateLimit.limit,
  message: 'Too many booking requests. Please wait and try again.',
});

module.exports = { authLimiter, bookingLimiter };
