const BLOCKED_KEY = /^\$|\.|^__proto__$/;
const HTML_TAG = /<[^>]*>/g;
const SKIPPED_FIELDS = new Set(['password', 'currentPassword', 'newPassword']);

function sanitiseValue(value, key) {
  if (typeof value === 'string') {
    return SKIPPED_FIELDS.has(key) ? value : value.replace(HTML_TAG, '');
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitiseValue(item, key));
  }

  if (value !== null && typeof value === 'object') {
    return sanitiseObject(value);
  }

  return value;
}

function sanitiseObject(input) {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => !BLOCKED_KEY.test(key))
      .map(([key, value]) => [key, sanitiseValue(value, key)]),
  );
}

function sanitise(req, res, next) {
  if (req.body !== null && typeof req.body === 'object') {
    req.body = sanitiseObject(req.body);
  }

  if (req.query !== null && typeof req.query === 'object') {
    Object.defineProperty(req, 'query', {
      value: sanitiseObject(req.query),
      writable: true,
      configurable: true,
    });
  }

  next();
}

module.exports = { sanitise };
