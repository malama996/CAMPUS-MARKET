import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { authRouter } from './routes/auth.js';
import { listingsRouter } from './routes/listings.js';
import { socialRouter } from './routes/social.js';
import { chatRouter } from './routes/chat.js';
import { institutionsRouter } from './routes/institutions.js';

const app = express();

// ─── SECURITY & MIDDLEWARE ─────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // handled by NGINX in production
}));
app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(',') || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Trust proxy (NGINX in front)
app.set('trust proxy', 1);

// ─── HEALTH CHECK ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString(), env: process.env.NODE_ENV }));
app.get('/', (_req, res) => res.json({ message: 'Campus Market API is running', env: process.env.NODE_ENV }));

// ─── ROUTES ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api', socialRouter);
app.use('/api/chat', chatRouter);
app.use('/api/institutions', institutionsRouter);

// ─── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));

// ─── CENTRAL ERROR HANDLER ─────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[error]', err.status || 500, req.method, req.path, err.message);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: isProd ? 'Internal server error' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
});

// ─── START ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log(`[campus-market-api] listening on :${PORT} (${process.env.NODE_ENV || 'development'})`));

// ─── GRACEFUL SHUTDOWN ─────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`[shutdown] ${signal} received, closing server...`);
  server.close(() => {
    console.log('[shutdown] HTTP server closed. Exiting.');
    process.exit(0);
  });
  setTimeout(() => { console.error('[shutdown] Force exit after timeout'); process.exit(1); }, 10000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
