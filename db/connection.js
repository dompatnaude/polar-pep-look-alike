const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const dataDir = path.join(__dirname, '..', 'data');
const databasePath = process.env.DATABASE_PATH || path.join(dataDir, 'app.db');

let dbPromise;

async function getDb() {
  if (!dbPromise) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    dbPromise = open({
      filename: databasePath,
      driver: sqlite3.Database
    }).then(async (db) => {
      await db.exec('PRAGMA foreign_keys = ON;');
      return db;
    });
  }

  return dbPromise;
}

module.exports = { getDb, databasePath };
