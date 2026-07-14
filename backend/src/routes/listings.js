import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { redis, CACHE_TTL_SECONDS } from '../config/redis.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { enforceFreeListingCap, incrementListingCount, decrementListingCount } from '../middleware/freeTier.js';
import { checkListingForFraud } from '../utils/fraud.js';
import { getSimilarListings } from '../utils/similarity.js';

export const listingsRouter = Router();

// ─── FEED CACHE HELPERS ─────────────────────────────────────────────────────
// Upstash/serverless Redis does not reliably support KEYS/SCAN for bulk
// invalidation, so we track every cache key we write in a Redis SET and
// invalidate against that set instead of scanning.
const FEED_KEYS_SET = 'feed:keys';

async function cacheFeedPage(cacheKey, payload) {
  try {
    await redis.set(cacheKey, payload, { ex: CACHE_TTL_SECONDS.feedPage });
    await redis.sadd(FEED_KEYS_SET, cacheKey);
  } catch (err) {
    console.error('[feed] cache write failed:', err.message);
  }
}

async function invalidateFeedCache() {
  try {
    const keys = await redis.smembers(FEED_KEYS_SET);
    if (keys?.length) {
      await Promise.all(keys.map((key) => redis.del(key)));
      await redis.del(FEED_KEYS_SET);
    }
  } catch (err) {
    // This must be loud — a silent failure here is what causes deleted/stale
    // listings to keep appearing in the feed after a delete or update.
    console.error('[feed] cache invalidation FAILED:', err.message);
  }
}

// Copperbelt-only institutions (scope guard)
const COPPERBELT_INSTITUTIONS = [
  'Copperbelt University', 'CBU', 'TEVET', 'Zambia University of Technology',
  'ZUT', 'Nkana Secondary School', 'Kitwe College', 'Ndola Institute',
  'Copperbelt Health Education Institute', 'CHEI', 'Luanshya College', 'Mufulira College',
];

const createListingSchema = z.object({
  category_id: z.number().int().min(1).max(7),
  title: z.string().min(3).max(120),
  description: z.string().max(2000).default(''),
  price_zmw: z.number().min(0),
  is_negotiable: z.boolean().default(true),
  school: z.string().min(2),
  hostel: z.string().optional().nullable(),
  images: z.array(z.string().url()).max(6).default([]),
  // Idempotency key: frontend generates one UUID per create-form session and
  // sends it with every submit attempt. Lets us safely dedupe retries/double
  // submits without blocking legitimate re-posts of similar items.
  client_id: z.string().uuid().optional(),
});

// ─── FEED (cursor-based, Copperbelt-scoped) ────────────────────────────────
listingsRouter.get('/feed', optionalAuth, async (req, res, next) => {
  try {
    const PAGE_SIZE = 20;
    const { cursor, school, category, min_price, max_price } = req.query;
    const cacheKey = `feed:${school||'all'}:${category||'all'}:${cursor||'head'}:${min_price||''}:${max_price||''}`;

    // Cache-aside: try Redis first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json({ ...cached, cached: true });
    } catch (cacheErr) {
      console.warn('[feed] Redis unavailable, querying DB directly:', cacheErr.message);
    }

    let query = supabaseAdmin
      .from('listings')
      .select(`
        id, title, description, price_zmw, is_negotiable, school, hostel, images,
        like_count, comment_count, view_count, created_at, category_id,
        seller:profiles!listings_seller_id_fkey ( id, username, display_name, avatar_url, is_seller_verified )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (cursor)    query = query.lt('created_at', cursor);
    if (school)    query = query.eq('school', school);
    if (category)  query = query.eq('category_id', parseInt(category, 10));
    if (min_price) query = query.gte('price_zmw', parseFloat(min_price));
    if (max_price) query = query.lte('price_zmw', parseFloat(max_price));

    const { data, error } = await query;
    if (error) throw error;

    const nextCursor = data.length === PAGE_SIZE ? data[data.length - 1].created_at : null;
    const payload = { listings: data, nextCursor, total: data.length };

    // Write to cache (fire-and-forget is fine for writes, just not for invalidation)
    cacheFeedPage(cacheKey, payload).catch(() => {});
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// ─── SEARCH ────────────────────────────────────────────────────────────────
listingsRouter.get('/search', optionalAuth, async (req, res, next) => {
  try {
    const { q, school, category, limit = 20, offset = 0 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    let query = supabaseAdmin
      .from('listings')
      .select(`
        id, title, price_zmw, images, school, like_count, created_at, category_id,
        seller:profiles!listings_seller_id_fkey ( id, username, display_name, avatar_url, is_seller_verified )
      `)
      .eq('status', 'active')
      .textSearch('search_vector', q.trim(), { type: 'websearch', config: 'english' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (school)   query = query.eq('school', school);
    if (category) query = query.eq('category_id', parseInt(category, 10));

    const { data, error } = await query;
    if (error) throw error;
    res.json({ listings: data, query: q });
  } catch (err) {
    next(err);
  }
});

// ─── SAVED LISTINGS ────────────────────────────────────────────────────────
listingsRouter.get('/saved', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('saved_listings')
      .select(`
        created_at,
        listing:listings (
          id, title, price_zmw, images, school, like_count, created_at, category_id,
          seller:profiles!listings_seller_id_fkey ( id, username, display_name, avatar_url )
        )
      `)
      .eq('user_id', req.user.id)
      .eq('listing.status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const listings = (data || []).map(s => s.listing).filter(Boolean);
    res.json({ listings });
  } catch (err) {
    next(err);
  }
});

// ─── GET SINGLE LISTING ────────────────────────────────────────────────────
listingsRouter.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select(`
        *, 
        seller:profiles!listings_seller_id_fkey ( id, username, display_name, avatar_url, follower_count, is_seller_verified, bio ),
        category:categories ( id, slug, label, icon )
      `)
      .eq('id', req.params.id)
      .neq('status', 'removed')
      .single();

    if (error) return res.status(404).json({ error: 'Listing not found' });

    // Check if current user has saved this listing
    let viewerHasSaved = false;
    if (req.user) {
      const { data: saved } = await supabaseAdmin
        .from('saved_listings')
        .select('listing_id')
        .eq('user_id', req.user.id)
        .eq('listing_id', req.params.id)
        .maybeSingle();
      viewerHasSaved = !!saved;
    }

    // Async view increment (never slows response)
    supabaseAdmin
      .from('listings')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', req.params.id)
      .then(() => {})
      .catch(() => {});

    res.json({ listing: { ...data, viewerHasSaved } });
  } catch (err) {
    next(err);
  }
});

// ─── SIMILAR LISTINGS (AI + mandatory fallback) ─────────────────────────────
listingsRouter.get('/:id/similar', optionalAuth, async (req, res, next) => {
  try {
    const { data: target, error } = await supabaseAdmin
      .from('listings')
      .select('id, title, description, category_id, school')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Listing not found' });

    // Pull candidates: same school + category, recent
    const { data: candidates } = await supabaseAdmin
      .from('listings')
      .select('id, title, description, price_zmw, images, category_id, school, like_count, created_at, seller:profiles!listings_seller_id_fkey(id, username, display_name, avatar_url)')
      .eq('status', 'active')
      .eq('school', target.school)
      .neq('id', target.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const { results, source } = await getSimilarListings(target, candidates || [], 6);
    res.json({ similar: results, source });
  } catch (err) {
    // Even if this whole endpoint fails, return empty gracefully
    console.error('[similar] error:', err.message);
    res.json({ similar: [], source: 'error-fallback' });
  }
});

// ─── CREATE LISTING ────────────────────────────────────────────────────────
listingsRouter.post(
  '/',
  requireAuth,
  enforceFreeListingCap,
  rateLimit({ windowSeconds: 3600, max: 20, keyPrefix: 'create-listing' }),
  async (req, res, next) => {
    try {
      const parsed = createListingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid listing payload', details: parsed.error.flatten() });
      }

      const { client_id, ...listingFields } = parsed.data;

      // Idempotency check: if this exact client_id was already used by this
      // seller, return the existing listing instead of creating a duplicate.
      // Covers double-clicks, client retries on timeout, and page refreshes
      // that resubmit the same form.
      if (client_id) {
        const { data: existing } = await supabaseAdmin
          .from('listings')
          .select('*')
          .eq('seller_id', req.user.id)
          .eq('client_id', client_id)
          .maybeSingle();

        if (existing) {
          return res.status(200).json({ listing: existing, deduped: true });
        }
      }

      const row = { ...listingFields, client_id: client_id || null, seller_id: req.user.id };

      const { data, error } = await supabaseAdmin
        .from('listings')
        .insert(row)
        .select()
        .single();

      if (error) {
        // Unique constraint on (seller_id, client_id) tripped by a concurrent
        // duplicate request — fetch and return the row that won the race.
        if (error.code === '23505' && client_id) {
          const { data: existing } = await supabaseAdmin
            .from('listings')
            .select('*')
            .eq('seller_id', req.user.id)
            .eq('client_id', client_id)
            .maybeSingle();
          if (existing) return res.status(200).json({ listing: existing, deduped: true });
        }
        throw error;
      }

      // Increment free-tier counter
      await incrementListingCount(req.user.id);

      // Async fraud check — never blocks the response
      checkListingForFraud(data).then(async flags => {
        if (flags.length) {
          await supabaseAdmin.from('moderation_flags').insert(
            flags.map(f => ({ listing_id: data.id, reason: f.reason, severity: f.severity }))
          );
        }
      }).catch(err => console.error('[fraud] check failed:', err.message));

      // Bust all cached feed variants so removed/created listings do not linger
      invalidateFeedCache().catch(() => {});

      res.status(201).json({ listing: data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── UPDATE LISTING ─────────────────────────────────────────────────────────
listingsRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const allowed = ['title', 'description', 'price_zmw', 'is_negotiable', 'status', 'images'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data, error } = await supabaseAdmin
      .from('listings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('seller_id', req.user.id)
      .select()
      .single();

    if (error) return res.status(403).json({ error: 'Not your listing, or listing not found' });

    // Status/price/etc changes can affect what the feed shows — keep it fresh.
    await invalidateFeedCache();

    res.json({ listing: data });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE LISTING ─────────────────────────────────────────────────────────
listingsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .update({ status: 'removed', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('seller_id', req.user.id)
      .select('id')
      .single();

    if (error || !data) return res.status(403).json({ error: 'Not your listing, or listing not found' });

    await decrementListingCount(req.user.id);

    // Await this — a delete must clear the cache before responding, otherwise
    // a fast client refetch can still hit the stale cached feed page and show
    // the just-deleted listing.
    await invalidateFeedCache();

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ─── SAVE / UNSAVE ─────────────────────────────────────────────────────────
listingsRouter.post('/:id/save', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('saved_listings')
      .insert({ user_id: req.user.id, listing_id: req.params.id });
    if (error && error.code !== '23505') throw error;
    res.status(204).send();
  } catch (err) { next(err); }
});

listingsRouter.delete('/:id/save', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('saved_listings')
      .delete()
      .eq('user_id', req.user.id)
      .eq('listing_id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── REPORT LISTING ─────────────────────────────────────────────────────────
const reportSchema = z.object({
  reason: z.enum(['spam', 'scam', 'inappropriate', 'wrong_category', 'already_sold', 'other']),
  detail: z.string().max(500).optional(),
});

listingsRouter.post(
  '/:id/report',
  requireAuth,
  rateLimit({ windowSeconds: 3600, max: 10, keyPrefix: 'report' }),
  async (req, res, next) => {
    try {
      const parsed = reportSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid report' });

      const { error } = await supabaseAdmin
        .from('reports')
        .insert({
          listing_id: req.params.id,
          reporter_id: req.user.id,
          reason: parsed.data.reason,
          detail: parsed.data.detail || null,
        });

      if (error && error.code === '23505') {
        return res.status(409).json({ error: 'You already reported this listing' });
      }
      if (error) throw error;
      res.status(204).send();
    } catch (err) { next(err); }
  }
);