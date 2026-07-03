import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

export const socialRouter = Router();

// ---------- LIKES ----------
socialRouter.post('/listings/:id/like', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('likes')
      .insert({ user_id: req.user.id, listing_id: req.params.id });

    // Unique constraint violation just means already-liked; treat as idempotent success.
    if (error && error.code !== '23505') throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

socialRouter.delete('/listings/:id/like', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('likes')
      .delete()
      .eq('user_id', req.user.id)
      .eq('listing_id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---------- COMMENTS ----------
const commentSchema = z.object({ body: z.string().min(1).max(500) });

socialRouter.get('/listings/:id/comments', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .select('id, body, created_at, user:profiles ( id, username, display_name, avatar_url )')
      .eq('listing_id', req.params.id)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) throw error;
    res.json({ comments: data });
  } catch (err) {
    next(err);
  }
});

socialRouter.post(
  '/listings/:id/comments',
  requireAuth,
  rateLimit({ windowSeconds: 60, max: 15, keyPrefix: 'comment' }),
  async (req, res, next) => {
    try {
      const parsed = commentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Comment body required (max 500 chars)' });

      const { data, error } = await supabaseAdmin
        .from('comments')
        .insert({ listing_id: req.params.id, user_id: req.user.id, body: parsed.data.body })
        .select('id, body, created_at, user:profiles ( id, username, display_name, avatar_url )')
        .single();

      if (error) throw error;
      res.status(201).json({ comment: data });
    } catch (err) {
      next(err);
    }
  }
);

// ---------- FOLLOWS ----------
socialRouter.post('/sellers/:id/follow', requireAuth, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: "You can't follow yourself" });
    }
    const { error } = await supabaseAdmin
      .from('follows')
      .insert({ follower_id: req.user.id, seller_id: req.params.id });

    if (error && error.code !== '23505') throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

socialRouter.delete('/sellers/:id/follow', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('follows')
      .delete()
      .eq('follower_id', req.user.id)
      .eq('seller_id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---------- STOREFRONT ----------
socialRouter.get('/sellers/:id/storefront', async (req, res, next) => {
  try {
    const [{ data: profile, error: profileErr }, { data: listings, error: listingsErr }] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', req.params.id).single(),
      supabaseAdmin
        .from('listings')
        .select('id, title, price_zmw, images, like_count, created_at')
        .eq('seller_id', req.params.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
    ]);

    if (profileErr) return res.status(404).json({ error: 'Seller not found' });
    if (listingsErr) throw listingsErr;

    res.json({ profile, listings });
  } catch (err) {
    next(err);
  }
});
