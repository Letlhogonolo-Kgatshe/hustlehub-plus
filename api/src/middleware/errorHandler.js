/**
 * errorHandler.js
 *
 * Centralised error-handling middleware for HustleHub+.
 *
 * Purpose:
 *   Express calls this automatically whenever a route handler or other
 *   middleware calls next(err), or throws inside an async handler wrapped
 *   to forward errors. It is the single place responsible for deciding
 *   what the client is allowed to see when something goes wrong.
 *
 * How it fits into the request flow:
 *   Client -> route handler (throws / calls next(err)) -> errorHandler (this file) -> Client
 *
 *   This must be registered LAST in app.js, after all other routes and
 *   middleware, because Express identifies error-handling middleware by
 *   its four-argument signature (err, req, res, next) and only reaches it
 *   when an error is explicitly passed along.
 *
 * Security notes:
 *   - Internal details (stack traces, file paths, database errors,
 *     environment/config values) are logged server-side for debugging but
 *     are never included in the response body sent to the client.
 *   - Every error response uses the same consistent JSON shape, so the
 *     frontend can rely on a predictable structure and so no accidental
 *     variation in wording hints at internal implementation details.
 *   - Unexpected errors (anything without a deliberately set statusCode)
 *     default to a generic 500 message rather than exposing the raw
 *     error's message text, which could contain sensitive detail
 *     (e.g. a database connection string in a thrown error).
 */

/**
 * Express error-handling middleware. Must be registered after all routes.
 *
 * @param {Error & { statusCode?: number, expose?: boolean }} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  // Full error detail (stack trace, message) is logged server-side only.
  // This is what developers use to debug; it must never reach the client.
  // Bad JSON and oversized bodies are the client's fault (warn); anything else is ours (error).
  // The stack trace is kept out of production logs because they leave the machine.
  logger.log(err.type ? 'warn' : 'error', 'unhandled_error', {
    method: req.method,
    path: req.originalUrl.split('?')[0],
    userId: req.user ? req.user.id : undefined,
    errorType: err.type || err.name,
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }

  // Only trust a statusCode if the route/controller deliberately set one
  // (e.g. a validation error explicitly throwing with statusCode 400).
  // Anything else is treated as an unexpected server error.
  const statusCode = err.statusCode || 500;

  // `expose` lets a controller opt in to sending a specific, safe message
  // to the client (e.g. "Email already registered"). Errors that don't
  // explicitly opt in fall back to a generic message, so raw internal
  // error text is never leaked by accident.
  const clientMessage = err.expose && err.message
    ? err.message
    : 'An unexpected error occurred. Please try again later.';

  res.status(statusCode).json({ error: clientMessage });
}

module.exports = { errorHandler };