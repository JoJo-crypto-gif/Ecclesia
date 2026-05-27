import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pool from './config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection } from './config/db.js';
import apiRoutes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import { initCronJobs } from './services/cronService.js';

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = isProduction
  ? (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : ['http://localhost:3000', 'https://localhost:3000', 'http://localhost:5173', 'https://localhost:5173'];
const sessionCookieSameSite = (process.env.SESSION_COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax')).toLowerCase();

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production.');
}

if (isProduction && process.env.TRUST_PROXY !== 'false') {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

// ─── Security ────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// ─── Logging ─────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Body Parsing ────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Session Auth ────────────────────────────────────────
const PgStore = connectPgSimple(session);
app.use(session({
  store: new PgStore({
    pool,
    tableName: 'user_sessions',
  }),
  name: 'ecclesia.sid',
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: sessionCookieSameSite,
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 12, // 12 hours
  },
}));

// Temporary session debug logging
app.use((req, res, next) => {
  console.log(`[Session Debug] ${req.method} ${req.path} | Has Cookie: ${req.headers.cookie ? 'yes' : 'no'} | Cookie Length: ${req.headers.cookie ? req.headers.cookie.length : 0} | SessionID: ${req.sessionID} | User: ${req.session?.user ? req.session.user.email : 'none'}`);
  next();
});

// ─── Static Files ────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ─── Health Check ────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const dbOk = await testConnection({ logSuccess: false });
    res.json({
      status: 'ok',
      db: dbOk ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ─── API Routes ──────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Production Frontend Serving ─────────────────────────
if (process.env.NODE_ENV === 'production' || process.env.SERVE_FRONTEND === 'true') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const buildPath = path.resolve(__dirname, '../client/dist');
  
  app.use(express.static(buildPath));
  
  // Handle client-side routing
  app.get('*', (req, res, next) => {
    // If request is for /api, don't serve index.html
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// ─── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route ${req.method} ${req.path} not found` },
  });
});

// ─── Error Handler ───────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────
async function start() {
  // Test DB connection on startup
  const dbOk = await testConnection();
  if (!dbOk) {
    console.warn('⚠️  Server starting without database connection');
  }

  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║  🏛️  Ecclesia Server                        ║
║  Port: ${String(PORT).padEnd(38)}║
║  Mode: ${String(process.env.NODE_ENV || 'development').padEnd(38)}║
║  DB:   ${dbOk ? '✅ Connected'.padEnd(38) : '❌ Disconnected'.padEnd(38)}║
╚══════════════════════════════════════════════╝
    `);
  });
  
  // Start automated jobs
  initCronJobs();
}

start();
