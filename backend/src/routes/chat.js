import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { flagSuspiciousMessage } from '../utils/fraud.js';

export const chatRouter = Router();

// GET /api/chat/threads — all threads for the current user, newest first.
// Excludes threads the current user has deleted their own side of.
chatRouter.get('/threads', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('chat_threads')
      .select(`
        id, buyer_id, seller_id, last_message_at, deleted_by_buyer, deleted_by_seller,
        listing:listings ( id, title, images ),
        buyer:profiles!chat_threads_buyer_id_fkey ( id, username, display_name, avatar_url ),
        seller:profiles!chat_threads_seller_id_fkey ( id, username, display_name, avatar_url )
      `)
      .or(`buyer_id.eq.${req.user.id},seller_id.eq.${req.user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Filter out threads this user deleted their own side of. Done in JS
    // rather than in the query because the "which side am I" check depends
    // on which of buyer_id/seller_id matches the current user.
    const visible = (data || []).filter((t) => {
      const isBuyer = t.buyer_id === req.user.id;
      return isBuyer ? !t.deleted_by_buyer : !t.deleted_by_seller;
    });

    res.json({ threads: visible });
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
        id, buyer_id, seller_id, last_message_at, deleted_by_buyer, deleted_by_seller,
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

    // If the buyer previously deleted this thread and is messaging again,
    // un-hide it on their side so it reappears in their inbox.
    if (data.deleted_by_buyer || data.deleted_by_seller) {
      const isBuyer = data.buyer_id === req.user.id;
      const { data: restored, error: restoreErr } = await supabaseAdmin
        .from('chat_threads')
        .update(isBuyer ? { deleted_by_buyer: false } : { deleted_by_seller: false })
        .eq('id', data.id)
        .select()
        .single();
      if (!restoreErr) return res.status(201).json({ thread: restored });
    }

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
      .select('id, body, sender_id, is_flagged, is_read, created_at')
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

      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .insert({ thread_id: req.params.id, sender_id: req.user.id, body: parsed.data.body, is_flagged })
        .select()
        .single();

      if (error) throw error;

      // Sending a new message un-hides the thread for BOTH sides — if either
      // participant had deleted it, a fresh message means the conversation
      // is active again and both should see it in their inbox.
      await supabaseAdmin
        .from('chat_threads')
        .update({
          last_message_at: new Date().toISOString(),
          deleted_by_buyer: false,
          deleted_by_seller: false,
        })
        .eq('id', req.params.id);

      // Realtime delivery happens automatically via Supabase Realtime's Postgres
      // replication stream — the frontend subscribes directly to this table/thread.
      res.status(201).json({ message: data });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/chat/threads/:id/messages/read — mark all of the OTHER
// participant's messages in this thread as read by the current user.
// Called when a participant opens/views the thread. The sender's client
// picks up the resulting is_read change via the Realtime UPDATE subscription
// on chat_messages, which is what flips their tick from delivered to read.
chatRouter.patch('/threads/:id/messages/read', requireAuth, async (req, res, next) => {
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

    // Only mark messages sent by the OTHER participant as read — a user
    // reading their own sent messages is meaningless.
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .update({ is_read: true })
      .eq('thread_id', req.params.id)
      .neq('sender_id', req.user.id)
      .eq('is_read', false);

    if (error) throw error;

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// DELETE /api/chat/threads/:id — remove this thread from MY inbox only.
// The other participant still sees it and their messages are untouched.
// This is a soft delete: it flips deleted_by_buyer or deleted_by_seller
// depending on which side the current user is on.
chatRouter.delete('/threads/:id', requireAuth, async (req, res, next) => {
  try {
    const { data: thread, error: threadErr } = await supabaseAdmin
      .from('chat_threads')
      .select('id, buyer_id, seller_id, deleted_by_buyer, deleted_by_seller')
      .eq('id', req.params.id)
      .single();

    if (threadErr) return res.status(404).json({ error: 'Thread not found' });
    if (![thread.buyer_id, thread.seller_id].includes(req.user.id)) {
      return res.status(403).json({ error: 'Not a participant in this thread' });
    }

    const isBuyer = thread.buyer_id === req.user.id;
    const update = isBuyer ? { deleted_by_buyer: true } : { deleted_by_seller: true };

    const { error: updateErr } = await supabaseAdmin
      .from('chat_threads')
      .update(update)
      .eq('id', req.params.id);

    if (updateErr) throw updateErr;

    // If BOTH sides have now deleted it, permanently remove the thread.
    // chat_messages cascades automatically (ON DELETE CASCADE on thread_id).
    const otherSideAlreadyDeleted = isBuyer ? thread.deleted_by_seller : thread.deleted_by_buyer;
    if (otherSideAlreadyDeleted) {
      await supabaseAdmin.from('chat_threads').delete().eq('id', req.params.id);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});