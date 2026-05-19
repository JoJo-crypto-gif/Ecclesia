import pg from 'pg';
import fs from 'fs';
const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

const toInt = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

if (!process.env.DATABASE_URL) {
  if (isProduction) {
    throw new Error('DATABASE_URL must be set in production.');
  }
  console.warn('⚠️ DATABASE_URL is not set. Database queries will fail until it is configured.');
}

const useSsl = toBool(process.env.DATABASE_SSL, isProduction);
const rejectUnauthorized = toBool(
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED,
  isProduction
);

let sslConfig = undefined;
if (useSsl) {
  sslConfig = { rejectUnauthorized };
  
  // If we are strictly enforcing SSL (rejectUnauthorized is true), load the cert
  if (rejectUnauthorized) {
    try {
      // Render stores Secret Files at this exact path
      sslConfig.ca = fs.readFileSync('/etc/secrets/ca.pem').toString();
    } catch (err) {
      console.warn('⚠️ CA certificate not found at /etc/secrets/ca.pem. Connection will likely fail.');
    }
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: toInt(process.env.DB_POOL_MAX, 20),
  idleTimeoutMillis: toInt(process.env.DB_IDLE_TIMEOUT_MS, 30000),
  connectionTimeoutMillis: toInt(process.env.DB_CONNECT_TIMEOUT_MS, 5000),
  statement_timeout: toInt(process.env.DB_STATEMENT_TIMEOUT_MS, 30000),
  query_timeout: toInt(process.env.DB_QUERY_TIMEOUT_MS, 30000),
  ssl: sslConfig,
});

// Log pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected pool error:', err.message);
});

/**
 * Test the database connection.
 * @returns {Promise<boolean>}
 */
export async function testConnection({ logSuccess = true } = {}) {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    if (logSuccess) {
      console.log(`✅ Database connected at ${result.rows[0].now}`);
    }
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

/**
 * Execute a parameterized query.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Query [${duration}ms]: ${text.substring(0, 80)}...`);
  }

  return result;
}

export default pool;