// Entry point. Loads config, connects the database, then starts HTTPS.
// Routing lives in app.js so the app can be imported without listening.

const fs = require('fs');
const https = require('https');
const { config } = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/db');
const app = require('./app');
const logger = require('./utils/logger');

// env.js has already checked these files exist and are readable
/* eslint-disable security/detect-non-literal-fs-filename -- the paths come from the server's own settings, never from a request */
const credentials = {
  key: fs.readFileSync(config.sslKeyPath),
  cert: fs.readFileSync(config.sslCertPath),
};
/* eslint-enable security/detect-non-literal-fs-filename */

const server = https.createServer(credentials, app);

// without this node prints an unhandled 'error' event and a full stack trace
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `HustleHub+ API could not start: port ${config.port} is already in use. ` +
      'Stop the process using it, or set a different PORT in api/.env.'
    );
  } else if (err.code === 'EACCES') {
    console.error(
      `HustleHub+ API could not start: permission denied binding to port ${config.port}. ` +
      'Choose a port above 1024 in api/.env.'
    );
  } else {
    console.error(`HustleHub+ API could not start: ${err.message}`);
  }
  process.exit(1);
});

// docker sends SIGTERM and waits 10 seconds before killing the container
function shutdown(signal) {
  console.log(`${signal} received, shutting down.`);

  server.close(async () => {
    try {
      await disconnectDatabase();
    } catch {
      // already closing, nothing useful left to report
    }
    // send any logs still waiting for the cloud platform before the process ends
    await logger.flushLogs().catch(() => {});
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// connect before listening so no request arrives while mongoose is still connecting
async function start() {
  await connectDatabase();

  server.listen(config.port, () => {
    console.log(`HustleHub+ API running securely on https://localhost:${config.port} (${config.nodeEnv})`);
    logger.info('server_started', { port: config.port, cloudLogging: Boolean(config.logSink.url) });
  });
}

start();
