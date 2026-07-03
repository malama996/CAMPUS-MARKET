# Campus Market — Product Requirements Document

**Product name:** Campus Market ("Msika" — Bemba/Nyanja for "market", used as internal codename)
**One-liner:** A feed-first local marketplace where Zambian students buy, sell, and discover from people on their own campus — built to feel like scrolling a social feed, not browsing a catalog.

---

## 1. Problem

Students in Zambia currently trade through scattered WhatsApp groups, Facebook Marketplace, and word of mouth. This is:
- Unsearchable and unranked — good listings die in group chat noise
- Trust-poor — no seller history, no reviews, no verification
- Not campus-aware — no way to filter to "my hostel" or "my school"
- Bandwidth-hostile — Facebook and Instagram are heavy on Zambian mobile data bundles

## 2. Target users

| Persona | Need |
|---|---|
| **Seller-student** (sells snacks, secondhand clothes, textbooks, hair services, tutoring) | A free storefront, easy listing creation from a phone, direct chat with buyers |
| **Buyer-student** | Fast local discovery, trust signals, low-data browsing |
| **Campus micro-entrepreneur** (laundry, printing, salon) | Recurring "storefront" presence, follower base, service bookings |

## 3. Goals (v1)

1. Feed-based discovery of listings, ranked by recency + engagement + proximity (school/hostel)
2. Social primitives: like, comment, follow seller, share
3. Real-time 1:1 chat per listing
4. Seller storefronts (mini-profile with grid of listings, follower count, rating)
5. Theming system (Light / Dark / Neon / Afro-Tech) — cosmetic, no logic fork
6. Works acceptably on 3G / low-end Android (Lighthouse mobile score ≥ 80, feed payload < 150KB/page)

## 4. Non-goals (v1)

- Payments / escrow (v1 is discovery + chat; trades are arranged off-platform, cash-on-collection culturally standard)
- Delivery logistics
- Multi-country support (Zambia only, ZMW currency, +260 phone format)
- Native mobile app (PWA-ready responsive web only)

## 5. Success metrics

- D7 retention of sellers who post a first listing ≥ 30%
- Median time-to-first-reply on a chat ≤ 15 min during campus hours
- Feed scroll depth ≥ 15 listings/session (proxy for feed relevance)

## 6. Key user flows

1. **Onboard** → phone/email + school selection → land on Home Feed
2. **Post a listing** → camera/gallery → title, price (ZMW), category, campus/hostel tag → publish → appears in followers' feeds instantly (realtime)
3. **Browse feed** → infinite scroll, double-tap to like, tap to open Product Page
4. **Chat** → "Message seller" from Product Page → realtime thread
5. **Storefront** → tap seller avatar → grid of their listings, follow button, rating
6. **Theme switch** → profile → Theme Customizer → instant preview, persisted per-user

## 7. Constraints driving design

- **Free-tier infra** (Vercel/Render/Railway/Supabase/Upstash) → architecture must tolerate cold starts, connection limits, and storage quotas — see `ARCHITECTURE.md`
- **Low bandwidth** → image compression on upload, paginated feed (cursor-based, 10/page), skeleton loading, no autoplay video in v1
- **Single student developer** → monorepo, boring/proven stack (Next.js + Express + Postgres), no microservices

## 8. Out-of-scope risks acknowledged

- Fraud/scam listings — mitigated with basic heuristics (see AI FEATURES in `ARCHITECTURE.md`), not solved
- Content moderation is manual/report-based in v1, not automated
