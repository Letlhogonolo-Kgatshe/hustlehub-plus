const path = require('path');
const mongoose = require('mongoose');

const REPO_ROOT = path.join(__dirname, '..', '..');
require('dotenv').config({ path: path.join(REPO_ROOT, '.env'), quiet: true });

const APP_DB = 'hustlehub';
const USER_ALREADY_EXISTS = 51003;

function required(name) {
  // eslint-disable-next-line security/detect-object-injection -- name is a fixed setting name from this script, never user input
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set. It belongs in the .env file at the repository root.`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const rootUser = required('MONGO_ROOT_USERNAME');
  const rootPassword = required('MONGO_ROOT_PASSWORD');
  const appUser = required('MONGO_APP_USERNAME');
  const appPassword = required('MONGO_APP_PASSWORD');
  const host = process.env.MONGO_HOST || '127.0.0.1:27017';

  const uri = `mongodb://${encodeURIComponent(rootUser)}:${encodeURIComponent(rootPassword)}@${host}/${APP_DB}?authSource=admin`;

  const connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise();
  const roles = [{ role: 'readWrite', db: APP_DB }];

  try {
    await connection.db.command({ createUser: appUser, pwd: appPassword, roles });
    console.log(`Created user "${appUser}" with readWrite on ${APP_DB} only.`);
  } catch (err) {
    if (err.code !== USER_ALREADY_EXISTS) throw err;
    await connection.db.command({ updateUser: appUser, pwd: appPassword, roles });
    console.log(`User "${appUser}" already existed; password and roles updated.`);
  }

  console.log(`Point MONGO_URI in api/.env at this user with ?authSource=${APP_DB}`);
  await connection.close();
}

main().catch((err) => {
  console.error(`Could not create the database user: ${String(err.message).replace(/(mongodb(?:\+srv)?:\/\/)[^@\s]*@/gi, '$1<credentials hidden>@')}`);
  console.error('Is the container running? Start it with "docker compose up -d mongo" from the repository root.');
  process.exit(1);
});
