# System Architecture

## 1. High-level diagram (text)

```
                                   ┌─────────────────────────┐
                                   │        Vercel CDN        │
                                   │  Next.js (SSR + static)  │
                                   │  frontend/                │
                                   └────────────┬─────────────┘
                                                │ HTTPS (REST)
                                                │ WSS (realtime chat/feed)
                          ┌─────────────────────┼─────────────────────┐
                          │                                           │
                ┌─────────▼─────────┐                       ┌─────────▼─────────┐
                │  Render/Railway     │                       │  Supabase Realtime │
                │  Node/Express API   │◄──────────────────────┤  (Postgres CDC     │
                │  backend/            │      logical repl     │  channels)         │
                └─────────┬──────────┘                       └─────────┬─────────┘
                          │ pg (pooled, SSL)                            │
                          │                                             │
                ┌─────────▼─────────────────────────────────────────────▼────────┐
                │                     Supabase (Postgres + Auth + Storage)          │
                │  - Users/Auth (GoTrue)                                            │
                │  - Listings, Likes, Comments, Follows, Chats (Postgres)           │
                │  - Media (Storage buckets, image transform CDN)                    │
                │  - RLS policies enforce per-user data access                       │
                └────────────────────────────────────────────────────────────────┘
                          ▲
                          │ cache-aside
                ┌─────────┴─────────┐
                │  Upstash Redis      │  hot feed pages, rate limiting, session cache
                └────────────────────┘
```

## 2. Component breakdown

| Component | Tech | Responsibility |
|---|---|---|
| `frontend/` | Next.js 14 (App Router), Tailwind, Framer Motion | Feed UI, storefronts, chat UI, theme engine, PWA shell |
| `backend/` | Node.js + Express | Business logic, auth middleware, feed ranking, rate limiting, image pre-processing hooks |
| `database/` | Supabase Postgres | System of record; Row Level Security as the last line of defense even if API is bypassed |
| Realtime | Supabase Realtime (Postgres logical replication → websockets) | Live feed inserts, live chat messages, live like counters |
| Cache | Upstash Redis (REST-based, free tier) | Feed page cache (60s TTL), rate limiting counters, session/JWT blacklist |
| Storage | Supabase Storage | Listing images (auto-resized via transform API), avatars |
| Auth | Supabase Auth (JWT) | Email/phone OTP, session issuance; backend verifies JWT on every request |

Why this split: the Express backend is a thin, statelessness-preserving layer that exists mainly for (a) business logic Supabase RLS can't express cleanly (feed ranking, fraud heuristics) and (b) a stable place to add paid infra later without a frontend rewrite. Everything that *can* live in Postgres/RLS does, to reduce backend load on the free tier.

## 3. Scaling path (no redesign required)

| Stage | Change |
|---|---|
| 0 → 1k users | As described above, all free tier |
| 1k → 20k users | Upgrade Render to paid dyno (no cold starts), Supabase Pro (larger DB, daily backups), add CDN image resizing at upload time |
| 20k → 100k users | Split feed-ranking into a background worker (cron/queue via Upstash + a worker dyno) that pre-computes ranked feed pages instead of ranking on read |
| 100k+ | Move hot tables (likes, feed_cache) to a dedicated Redis-backed read model; consider read replicas for Postgres; introduce a search service (Postgres full-text is fine until ~500k listings, then consider Meilisearch/Typesense) |

The key invariant that makes this painless: **the frontend only ever talks to the backend's REST/WS contract, never directly to Postgres internals** (Supabase client is used only for Auth session + Storage uploads + Realtime subscriptions, not for arbitrary queries). This means backend internals can be re-architected without touching `frontend/`.

## 4. Data flow

### Request lifecycle (e.g., "like a listing")
1. Client optimistically increments like count in local state (instant UI feedback)
2. `POST /api/listings/:id/like` with JWT → Express verifies JWT via Supabase → inserts into `likes` table (unique constraint on `user_id, listing_id` prevents double-likes) → increments denormalized `listings.like_count` in same transaction
3. Postgres logical replication publishes the change → Supabase Realtime pushes a `listings:update` event → any other client currently viewing that listing updates its count live
4. Redis feed-page cache entries containing that listing are lazily invalidated (TTL-based, not actively purged, to keep it simple on free tier)

### Realtime updates
- Chat: client subscribes to `supabase.channel('chat:{thread_id}')`; new messages are inserted by the backend (never directly by client, so backend can run spam/fraud checks first) and broadcast automatically via Realtime
- Feed: new listings from followed sellers are pushed via a `feed:{user_id}` channel; client prepends to feed with a "New posts ↑" pill rather than jarring auto-scroll

### Feed ranking logic (v1, deliberately simple and explainable)
```
score = w1 * recency_decay(created_at)         # exponential decay, half-life 18h
      + w2 * log(1 + like_count + 2*comment_count)
      + w3 * same_campus_bonus(user, listing)   # +0.4 if same school/hostel tag
      + w4 * followed_seller_bonus              # +0.6 if user follows seller
weights: w1=1.0, w2=0.6, w3=1.0, w4=1.0
```
Computed in SQL at read time for v1 (cheap at this scale); becomes a scheduled materialized view once listings exceed ~50k rows (see scaling table above).

## 5. AI features (v1 scope — lightweight, no separate ML infra)

- **Recommendation**: the feed ranking formula above *is* the v1 recommendation system — collaborative-filtering-lite via `followed_seller_bonus` and `same_campus_bonus`. A proper embedding-based "similar listings" model is a Phase 4 item (see ROADMAP.md), likely calling the Anthropic API or a hosted embeddings endpoint rather than self-hosting a model.
- **Smart search**: Postgres full-text search (`tsvector` on title+description+category) with trigram similarity for typo tolerance (`pg_trgm` extension), good enough up to hundreds of thousands of listings.
- **Fraud detection basics**: rule-based, not ML — flags a listing if price is >70% below category median, if the seller account is <24h old and the price is "too good", or if a phone number appears in the listing text (used to route around in-app chat, a common scam pattern). Flags go into an `moderation_flags` table for manual review, never auto-delete.

## 6. Security checklist baked into architecture

- All tables have RLS enabled by default; policies allow `select` broadly (public marketplace) but restrict `insert/update/delete` to `auth.uid() = owner_id`
- JWT verified on every backend route via Supabase's JWKS endpoint, cached in-memory with short TTL
- Rate limiting via Redis token bucket per-IP and per-user (chat send, listing create, like)
- Image uploads validated for MIME type + size server-side before generating a Storage signed upload URL (never trust client-declared type)
