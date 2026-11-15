// Checks the environment before anything else loads, so a missing setting
// stops the server here instead of failing later inside a request.

const fs = require('fs');
const path = require('path');

const API_ROOT = path.join(__dirname, '..', '..');

require('dotenv').config({ path: path.join(API_ROOT, '.env'), quiet: true });

const MIN_SECRET_LENGTH = 32;
const DEFAULT_PORT = 5000;

// Faults get collected rather than thrown so one startup lists all of them.

function resolveCertificate(name, problems) {
  // eslint-disable-next-line security/detect-object-injection -- name is a fixed setting name from this file, never user input
  const configured = process.env[name];

  if (!configured) {
    problems.push(`${name} is not set. See api/.env.example for the expected value.`);
    return null;
  }

  // resolved against the api folder, not the current directory, so it works
  // whether you start from api/ or the repo root
  const absolutePath = path.resolve(API_ROOT, configured);

  try {
    fs.accessSync(absolutePath, fs.constants.R_OK);
  } catch {
    problems.push(
      `${name} is set to "${configured}" but that file cannot be read. ` +
      'Generate a local certificate into api/certs (for example with mkcert) ' +
      'or correct the path in api/.env.'
    );
    return null;
  }

  return absolutePath;
}

function resolvePort(problems) {
  if (!process.env.PORT) return DEFAULT_PORT;

  const port = Number(process.env.PORT);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push(`PORT is set to "${process.env.PORT}", which is not a valid port number.`);
    return DEFAULT_PORT;
  }

  return port;
}

function resolveJwtSecret(problems) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    problems.push(
      'JWT_SECRET is not set. Copy api/.env.example to api/.env and generate a ' +
      'secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
    return null;
  }

  // short secrets can be brute forced offline from any token signed with them
  if (secret.length < MIN_SECRET_LENGTH) {
    problems.push(
      `JWT_SECRET is only ${secret.length} characters long. ` +
      `It must be at least ${MIN_SECRET_LENGTH} characters so that tokens cannot be forged by guessing it.`
    );
    return null;
  }

  // only the length is ever reported, never the value
  return secret;
}

function resolveMongoUri(problems) {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    problems.push(
      'MONGO_URI is not set. Start the database with "docker compose up -d mongo" from the ' +
      'repository root, then copy the connection string from api/.env.example into api/.env.'
    );
    return null;
  }

  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    problems.push('MONGO_URI does not look like a MongoDB connection string. It must begin with mongodb:// or mongodb+srv://.');
    return null;
  }

  return uri;
}

const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];

// The cloud log platform is optional: with no URL the API logs to the console only.
function resolveLogSink(problems) {
  const url = process.env.LOG_SINK_URL;
  const token = process.env.LOG_SINK_TOKEN;

  if (!url && !token) return { url: null, token: null };

  if (!url || !token) {
    problems.push('LOG_SINK_URL and LOG_SINK_TOKEN must be set together (or both left empty to log to the console only).');
    return { url: null, token: null };
  }

  if (!/^https:\/\//i.test(url)) {
    problems.push('LOG_SINK_URL must start with https:// so logs are encrypted on their way to the platform.');
    return { url: null, token: null };
  }

  return { url, token };
}

function resolveLogLevel(problems) {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (!LOG_LEVELS.includes(level)) {
    problems.push(`LOG_LEVEL is set to "${process.env.LOG_LEVEL}". Use one of: ${LOG_LEVELS.join(', ')}.`);
    return 'info';
  }
  return level;
}

function loadConfig() {
  const problems = [];

  const jwtSecret = resolveJwtSecret(problems);
  const mongoUri = resolveMongoUri(problems);
  const sslKeyPath = resolveCertificate('SSL_KEY_PATH', problems);
  const sslCertPath = resolveCertificate('SSL_CERT_PATH', problems);
  const port = resolvePort(problems);
  const logSink = resolveLogSink(problems);
  const logLevel = resolveLogLevel(problems);

  if (problems.length > 0) {
    console.error('HustleHub+ API could not start because of its configuration:');
    problems.forEach((problem) => console.error(`  - ${problem}`));
    process.exit(1);
  }

  return Object.freeze({
    jwtSecret,
    mongoUri,
    clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5174')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    authRateLimit: {
      windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
    },
    bookingRateLimit: {
      windowMs: Number(process.env.BOOKING_RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000,
      limit: Number(process.env.BOOKING_RATE_LIMIT_MAX) || 20,
    },
    // failed logins in a row before an account is locked, and for how long
    lockout: {
      maxAttempts: Number(process.env.LOCKOUT_MAX_ATTEMPTS) || 5,
      durationMs: (Number(process.env.LOCKOUT_MINUTES) || 15) * 60 * 1000,
    },
    logLevel,
    logSink,
    sslKeyPath,
    sslCertPath,
    port,
    nodeEnv: process.env.NODE_ENV || 'development',
  });
}

module.exports = { config: loadConfig() };
