import { redis } from '../config/redis.js';

/**
 * Simple fixed-window rate limiter backed by Upstash Redis, keyed by user id (if authed)
 * or IP. Cheap on the free tier: one INCR + one EXPIRE per request.
 */
export function rateLimit({ windowSeconds, max, keyPrefix }) {
  return async function rateLimitMiddleware(req, res, next) {
    try {
      const identity = req.user?.id || req.ip;
      const key = `rl:${keyPrefix}:${identity}`;

      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (count > max) {
        return res.status(429).json({ error: 'Too many requests, slow down.' });
      }
      next();
    } catch (err) {
      // If Redis is unreachable, fail open rather than blocking the whole app.
      console.error('rateLimit error, failing open:', err.message);
      next();
    }
  };
}
