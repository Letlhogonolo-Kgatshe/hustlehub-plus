/**
 * logger.js
 *
 * The one logger for the whole API. Every line is a JSON object with a
 * timestamp, a level, an event name (the message) and a few fields, so the logs
 * can be searched and alerted on, not just read.
 *
 *   logger.info('login_success', { userId, role, ip });
 *   logger.warn('login_failed', { reason: 'wrong_password', userId, ip });
 *
 * Output goes to the console and, when LOG_SINK_URL and LOG_SINK_TOKEN are set,
 * to a cloud logging platform as well. Everything passes through logSanitiser
 * first, so secrets and line breaks never reach either place.
 */

const winston = require('winston');
const { config } = require('../config/env');
const { clean } = require('./logSanitiser');
const HttpSinkTransport = require('./httpSinkTransport');

const sanitiseLog = winston.format((info) => {
  const cleaned = Object.entries(info)
    .filter(([key]) => key !== 'level' && key !== 'timestamp')
    .map(([key, value]) => [key, clean(value, key)]);
  return Object.assign(info, Object.fromEntries(cleaned));
});

const transports = [new winston.transports.Console()];

let sink = null;
if (config.logSink.url) {
  sink = new HttpSinkTransport({ url: config.logSink.url, token: config.logSink.token });
  transports.push(sink);
}

const logger = winston.createLogger({
  level: config.logLevel,
  silent: config.nodeEnv === 'test',
  defaultMeta: { service: 'hustlehub-api', env: config.nodeEnv },
  format: winston.format.combine(winston.format.timestamp(), sanitiseLog(), winston.format.json()),
  transports,
});

// sends whatever is still buffered; called once during shutdown
async function flushLogs() {
  if (sink) await sink.flush();
}

module.exports = logger;
module.exports.flushLogs = flushLogs;
