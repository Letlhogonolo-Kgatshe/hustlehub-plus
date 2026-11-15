// MongoDB connection. Part 1 kept users in a JSON file; Part 2 uses a real
// database, and this is the only file that opens or closes it.

const mongoose = require('mongoose');
const { config } = require('./env');

// mongoose waits 30 seconds by default, which looks like a hang
const SERVER_SELECTION_TIMEOUT_MS = 5000;

let shuttingDown = false;

// driver errors can quote the URI they failed on, which includes the password
function redactCredentials(message) {
  return String(message).replace(/(mongodb(?:\+srv)?:\/\/)[^@\s]*@/gi, '$1<credentials hidden>@');
}

async function connectDatabase() {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
    });

    // database name only, never the connection string
    console.log(`Database connected (${mongoose.connection.name})`);

    // attached after connecting, otherwise a failed startup also reports
    // "connection lost", which sounds like a working connection dropped
    mongoose.connection.on('disconnected', () => {
      if (shuttingDown) return;
      console.warn('Database connection lost. Mongoose will keep retrying.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('Database connection restored.');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`Database error: ${redactCredentials(err.message)}`);
    });
  } catch (err) {
    console.error('HustleHub+ API could not start: the database could not be reached.');
    console.error(`  Reason: ${redactCredentials(err.message)}`);
    console.error('  Start MongoDB with "docker compose up -d mongo" from the repository root,');
    console.error('  then check MONGO_URI in api/.env.');
    process.exit(1);
  }
}

async function disconnectDatabase() {
  shuttingDown = true;
  await mongoose.connection.close();
}

module.exports = { connectDatabase, disconnectDatabase };
