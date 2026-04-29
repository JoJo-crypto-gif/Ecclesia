import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_LOCK_KEY = 684231947;

// Load .env BEFORE importing db (which needs DATABASE_URL)
const dotenvModule = await import('dotenv');
dotenvModule.config({ path: path.resolve(__dirname, '..', '.env') });

// Now dynamically import db after env is loaded
const { query, testConnection, default: pool } = await import('../config/db.js');

async function runMigrations() {
  console.log('🔄 Running migrations...');

  const connected = await testConnection();
  if (!connected) {
    throw new Error('Cannot run migrations — database not available');
  }

  await query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
  try {
    // Create migrations tracking table
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Read migration files
    const migrationsDir = path.resolve(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Check if already applied (inside tx while lock is held)
        const applied = await client.query('SELECT id FROM migrations WHERE name = $1', [file]);
        if (applied.rows.length > 0) {
          await client.query('ROLLBACK');
          console.log(`  ⏭️  ${file} (already applied)`);
          continue;
        }

        // Apply migration atomically with tracking insert
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✅ ${file}`);
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // no-op
        }
        throw new Error(`${file}: ${err.message}`);
      } finally {
        client.release();
      }
    }
  } finally {
    await query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
  }

  console.log('✅ Migrations complete');
}

runMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(`❌ Migration failed: ${err.message}`);
    process.exit(1);
  });
