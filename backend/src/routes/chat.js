import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { flagSuspiciousMessage } from '../utils/fraud.js';

export const chatRouter = Router();

// GET /api/chat/threads — all threads for the current user, newest first
chatRouter.get('/threads', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('chat_threads')
      .select(`
        id, buyer_id, seller_id, last_message_at, listing:listings ( id, title, images ),
        buyer:profiles!chat_threads_buyer_id_fkey ( id, username, display_name, avatar_url ),
        seller:profiles!chat_threads_seller_id_fkey ( id, username, display_name, avatar_url )
      `)
      .or(`buyer_id.eq.${req.user.id},seller_id.eq.${req.user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    res.json({ threads: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/threads/:id — thread metadata for the current user
chatRouter.get('/threads/:id', requireAuth, async (req, res, next) => {
  try {
    const { data: thread, error: threadErr } = await supabaseAdmin
      .from('chat_threads')
      .select(`
        id, buyer_id, seller_id, last_message_at,
        listing:listings ( id, title, images ),
        buyer:profiles!chat_threads_buyer_id_fkey ( id, username, display_name, avatar_url ),
        seller:profiles!chat_threads_seller_id_fkey ( id, username, display_name, avatar_url )
      `)
      .eq('id', req.params.id)
      .single();

    if (threadErr) return res.status(404).json({ error: 'Thread not found' });
    if (![thread.buyer_id, thread.seller_id].includes(req.user.id)) {
      return res.status(403).json({ error: 'Not a participant in this thread' });
    }

    const partner = thread.buyer_id === req.user.id ? thread.seller : thread.buyer;
    res.json({ thread: { ...thread, partner } });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/threads — get-or-create a thread for a listing
const startThreadSchema = z.object({ listing_id: z.string().uuid() });

chatRouter.post('/threads', requireAuth, async (req, res, next) => {
  try {
    const parsed = startThreadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'listing_id is required' });

    const { data: listing, error: listingErr } = await supabaseAdmin
      .from('listings')
      .select('id, seller_id')
      .eq('id', parsed.data.listing_id)
      .single();

    if (listingErr) return res.status(404).json({ error: 'Listing not found' });
    if (listing.seller_id === req.user.id) {
      return res.status(400).json({ error: "You can't message yourself about your own listing" });
    }

    const { data, error } = await supabaseAdmin
      .from('chat_threads')
      .upsert(
        { listing_id: listing.id, buyer_id: req.user.id, seller_id: listing.seller_id },
        { onConflict: 'listing_id,buyer_id,seller_id', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ thread: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/threads/:id/messages
chatRouter.get('/threads/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const { data: thread, error: threadErr } = await supabaseAdmin
      .from('chat_threads')
      .select('id, buyer_id, seller_id')
      .eq('id', req.params.id)
      .single();

    if (threadErr) return res.status(404).json({ error: 'Thread not found' });
    if (![thread.buyer_id, thread.seller_id].includes(req.user.id)) {
      return res.status(403).json({ error: 'Not a participant in this thread' });
    }

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('id, body, sender_id, is_flagged, created_at')
      .eq('thread_id', req.params.id)
      .order('created_at', { ascending: true })
      .limit(500);

    if (error) throw error;
    res.json({ messages: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/threads/:id/messages
const sendMessageSchema = z.object({ body: z.string().min(1).max(1000) });

chatRouter.post(
  '/threads/:id/messages',
  requireAuth,
  rateLimit({ windowSeconds: 60, max: 30, keyPrefix: 'chat-send' }),
  async (req, res, next) => {
    try {
      const parsed = sendMessageSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Message body required (max 1000 chars)' });

      const { data: thread, error: threadErr } = await supabaseAdmin
        .from('chat_threads')
        .select('id, buyer_id, seller_id')
        .eq('id', req.params.id)
        .single();

      if (threadErr) return res.status(404).json({ error: 'Thread not found' });
      if (![thread.buyer_id, thread.seller_id].includes(req.user.id)) {
        return res.status(403).json({ error: 'Not a participant in this thread' });
      }

      const is_flagged = flagSuspiciousMessage(parsed.data.body);

      // ─── TEMPORARY DEBUG LOGGING — remove once the RLS issue is diagnosed ───
      console.log('[CHAT-DEBUG] Insert attempt:', {
        thread_id: req.params.id,
        sender_id: req.user?.id,
        sender_id_type: typeof req.user?.id,
        is_flagged,
        keyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 30),
        keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
      });
      // ──────────────────────────────────────────────────────────────────────

      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .insert({ thread_id: req.params.id, sender_id: req.user.id, body: parsed.data.body, is_flagged })
        .select()
        .single();

      if (error) {
        // ─── TEMPORARY DEBUG LOGGING ───
        console.error('[CHAT-DEBUG] Insert FAILED:', JSON.stringify(error, null, 2));
        // ────────────────────────────────
        throw error;
      }

      // ─── TEMPORARY DEBUG LOGGING ───
      console.log('[CHAT-DEBUG] Insert SUCCEEDED, id:', data.id);
      // ────────────────────────────────

      await supabaseAdmin
        .from('chat_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', req.params.id);

      // Realtime delivery happens automatically via Supabase Realtime's Postgres
      // replication stream — the frontend subscribes directly to this table/thread.
      res.status(201).json({ message: data });
    } catch (err) {
      next(err);
    }
  }
);