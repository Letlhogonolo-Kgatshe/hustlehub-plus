/**
 * requestLogger.js
 *
 * Logs one line for every finished request, with the event name chosen from the
 * response status. This is what records 401, 403 and 429 responses without any
 * change to the routes themselves:
 *
 *   401 -> auth_rejected    (missing, invalid or expired token)
 *   403 -> access_denied    (right login, wrong role)
 *   429 -> rate_limited     (a rate limiter said no)
 *   5xx -> request_failed
 *   other 4xx -> request_rejected (validation errors, not found, conflicts)
 *   successful writes -> request_ok (info); successful reads -> request_ok (debug)
 *
 * It must be registered before the routes so that responses sent by rate limiters
 * and route guards are seen as well. It logs the path without the query string
 * and never touches the request body, so passwords and tokens cannot end up here.
 * A controller that has already logged a more specific event (for example
 * login_failed) sets res.locals.skipRequestLog to avoid a duplicate line.
 */

const logger = require('../utils/logger');

const QUIET_PATHS = new Set(['/', '/api/health']); // health checks would flood the logs

function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const path = req.originalUrl.split('?')[0];
    if (QUIET_PATHS.has(path) || res.locals.skipRequestLog) return;

    const status = res.statusCode;
    const fields = {
      method: req.method,
      path,
      status,
      durationMs: Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6),
      ip: req.ip,
      userId: req.user ? req.user.id : undefined,
    };

    if (status === 401) logger.warn('auth_rejected', fields);
    else if (status === 403) logger.warn('access_denied', { ...fields, role: req.user ? req.user.role : undefined });
    else if (status === 429) logger.warn('rate_limited', fields);
    else if (status >= 500) logger.error('request_failed', fields);
    else if (status >= 400) logger.info('request_rejected', fields);
    else if (req.method === 'GET') logger.debug('request_ok', fields);
    else logger.info('request_ok', fields);
  });

  next();
}

module.exports = { requestLogger };
