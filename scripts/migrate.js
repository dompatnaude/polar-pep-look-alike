require('dotenv').config();
const { runMigrations } = require('../db/migrate');

runMigrations()
  .then((result) => {
    console.log(`Migrations complete. Total: ${result.total}, Applied: ${result.applied}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
