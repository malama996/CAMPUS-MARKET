import { supabaseAdmin } from '../config/supabase.js';

/**
 * Verifies the Supabase-issued JWT on the Authorization header and attaches
 * the resolved user to req.user. Rejects with 401 if missing/invalid.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = data.user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional auth: attaches req.user if a valid token is present, otherwise
 * continues anonymously. Must never block or error the request — if token
 * verification throws for any reason (network blip, malformed token, etc.),
 * fail open and treat the request as anonymous rather than surfacing an
 * unhandled rejection or a false auth failure.
 */
export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();

    const { data } = await supabaseAdmin.auth.getUser(token);
    if (data?.user) req.user = data.user;
    next();
  } catch (err) {
    console.warn('[optionalAuth] verification failed, continuing anonymously:', err.message);
    next();
  }
}