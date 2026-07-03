# Development Roadmap (solo student developer)

Realistic pacing for one person working part-time alongside classes. Each phase ends in something demoable.

## Phase 1 — MVP (weeks 1–3)
- Supabase project + `schema.sql` applied
- Auth (email OTP) + profile completion
- Create listing, plain (non-ranked) feed, listing detail page
- Deploy skeleton to Vercel + Render so the demo URL exists from week 1

## Phase 2 — Social layer (weeks 4–5)
- Likes, comments, follows, storefronts
- Chat (threads + messages), Realtime wiring
- Feed ranking formula (recency + engagement + campus/follow bonuses)

## Phase 3 — UI polish & animation (weeks 6–7)
- Framer Motion feed transitions, like-burst micro-interaction
- Theme system (4 themes) + Theme Customizer screen
- Skeleton loading states, empty states, glassmorphism pass
- Mobile-first responsive QA on a real low-end Android device, not just DevTools

## Phase 4 — AI & trust features (weeks 8–9)
- Rule-based fraud flags (already scaffolded in `utils/fraud.js`) wired to a simple admin review view
- Postgres full-text + trigram smart search
- Optional: embeddings-based "similar listings" via a hosted API (evaluate cost before committing — this is the first feature that isn't free-tier-guaranteed)

## Phase 5 — Production hardening & launch (weeks 10–12)
- Rate limiting tuned from real usage, not guesses
- Load test (`docs/POST_DEPLOYMENT_AND_MODIFICATION.md` §2) before any campus-wide announcement
- Report/moderation flow for users (not just automated flags)
- Analytics: which categories/schools are active, to prioritize Phase 6 decisions
- Submit as final year project deliverable: PRD + architecture + live demo + this roadmap as evidence of planned, staged execution

## Beyond v1 (not scoped, listed for context)
- In-app payments/escrow (mobile money integration — MTN/Airtel Zambia)
- Delivery/logistics partner integration
- Native mobile wrapper (Capacitor) once the PWA has proven demand
