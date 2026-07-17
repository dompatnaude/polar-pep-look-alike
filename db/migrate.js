const fs = require('fs');
const path = require('path');
const { getDb } = require('./connection');
const { seedProducts, ensureAdminUser } = require('./seed-products');

const migrationsDir = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getAppliedMigrationNames(db) {
  const rows = await db.all('SELECT name FROM schema_migrations;');
  return new Set(rows.map((row) => row.name));
}

async function runMigrations() {
  const db = await getDb();
  await ensureMigrationsTable(db);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  const applied = await getAppliedMigrationNames(db);
  const pending = files.filter((name) => !applied.has(name));

  for (const name of pending) {
    const sql = fs.readFileSync(path.join(migrationsDir, name), 'utf8');

    await db.exec('BEGIN;');
    try {
      await db.exec(sql);
      await db.run('INSERT INTO schema_migrations (name) VALUES (?);', name);
      await db.exec('COMMIT;');
    } catch (error) {
      await db.exec('ROLLBACK;');
      throw error;
    }
  }

  const seedResult = await seedProducts();
  const adminResult = await ensureAdminUser();

  return {
    total: files.length,
    applied: pending.length,
    seeded: seedResult.inserted,
    adminPromoted: adminResult.promoted
  };
}

module.exports = { runMigrations };
