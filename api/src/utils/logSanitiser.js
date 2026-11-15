/**
 * logSanitiser.js
 *
 * Cleans anything that is about to be written to a log, so the logs are safe to
 * keep and to send to a third-party platform.
 *
 *   - Secrets: any field whose name looks like a password, hash, token, secret,
 *     authorization header, cookie or API key is replaced with [redacted].
 *   - Connection strings: the user and password inside mongodb:// URIs are hidden.
 *   - Log injection: line breaks and tabs are turned into spaces, so a value such
 *     as an email address cannot start a fake log line.
 *   - Size: long strings are cut, and deep or huge objects are truncated, so one
 *     request cannot flood the logs.
 *
 * It has no dependencies on the rest of the app, so it can be unit tested alone.
 */

const SECRET_KEY = /pass(word)?|hash|token|secret|authorization|cookie|jwt|api[-_]?key/i;
const CONNECTION_STRING = /(mongodb(?:\+srv)?:\/\/)[^@\s]*@/gi;
const MAX_STRING = 300;
const MAX_DEPTH = 4;
const MAX_ITEMS = 20;

function cleanString(value) {
  return value
    .replace(CONNECTION_STRING, '$1<credentials hidden>@')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, MAX_STRING);
}

function clean(value, key, depth = 0) {
  if (key && SECRET_KEY.test(key)) return '[redacted]';
  if (typeof value === 'string') return cleanString(value);
  if (value instanceof Error) return cleanString(value.message);

  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) return '[truncated]';
    return value.slice(0, MAX_ITEMS).map((item) => clean(item, key, depth + 1));
  }

  if (value !== null && typeof value === 'object') {
    if (depth >= MAX_DEPTH) return '[truncated]';
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, MAX_ITEMS)
        .map(([childKey, childValue]) => [childKey, clean(childValue, childKey, depth + 1)]),
    );
  }

  return value;
}

module.exports = { clean, cleanString, SECRET_KEY };
