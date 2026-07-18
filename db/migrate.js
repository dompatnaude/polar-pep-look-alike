const fs = require('fs');
const path = require('path');
const pool = require('./connection');

const migrationsDir = path.join(__dirname, 'migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrationNames() {
  const result = await pool.query('SELECT name FROM schema_migrations;');
  return new Set(result.rows.map((row) => row.name));
}

async function runMigrations() {
  await ensureMigrationsTable();

  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  const applied = await getAppliedMigrationNames();
  const pending = files.filter((name) => !applied.has(name));
  let appliedCount = 0;

  for (const name of pending) {
    const sql = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1);', [name]);
      await client.query('COMMIT');
      appliedCount += 1;
      console.log(`Applied migration: ${name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Failed migration: ${name}`);
      throw err;
    } finally {
      client.release();
    }
  }

  return { total: files.length, applied: appliedCount };
}

if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
      process.exit(1);
    });
}

module.exports = { runMigrations };
