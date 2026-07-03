# Campus Market

A feed-first local marketplace for Zambian students — listings behave like social content: like, comment, follow sellers, chat in real time, and customize your own theme (Light / Dark / Neon / Afro-Tech). Built to run entirely on free-tier infrastructure and scale without a redesign.

## Docs
- [`docs/PRD.md`](docs/PRD.md) — product requirements, goals, non-goals, success metrics
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system diagram, component breakdown, scaling path, feed ranking & fraud logic
- [`docs/API_DESIGN.md`](docs/API_DESIGN.md) — full endpoint reference
- [`docs/TESTING.md`](docs/TESTING.md) — unit, API, frontend, and manual testing strategy
- [`docs/CODE_REVIEW_GUIDE.md`](docs/CODE_REVIEW_GUIDE.md) — pre-deployment checklist
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — step-by-step free-tier deployment (Vercel + Render/Railway + Supabase + Upstash)
- [`docs/POST_DEPLOYMENT_AND_MODIFICATION.md`](docs/POST_DEPLOYMENT_AND_MODIFICATION.md) — verifying a live deploy, load testing, debugging, safe modification & versioning
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — 12-week solo-developer build plan

## Project structure

```
campus-market/
├── frontend/        Next.js 14 (App Router) + Tailwind + Framer Motion
│   ├── app/          routes (feed, listing, chat, theme settings...)
│   ├── components/   ListingCard, Feed, ThemeProvider, ThemeCustomizer
│   ├── lib/           supabaseClient.js (auth+realtime), api.js (backend calls)
│   └── styles/        globals.css — theme token system (4 themes as CSS vars)
├── backend/          Node.js + Express (ESM)
│   └── src/
│       ├── routes/    auth, listings, social, chat
│       ├── middleware/ auth (JWT verify), rateLimit (Redis)
│       ├── config/    supabase (service-role client), redis (Upstash)
│       └── utils/     fraud.js — rule-based fraud/spam heuristics
├── database/
│   └── schema.sql    Postgres schema, RLS policies, triggers for denormalized counters
└── infra/
    ├── docker-compose.yml   local full-stack dev
    ├── Dockerfile.frontend / Dockerfile.backend
    └── nginx.conf            local reverse proxy
```

## Quickstart (local dev)

```bash
# 1. Database — create a free Supabase project, run database/schema.sql in its SQL editor

# 2. Backend
cd backend
cp .env.example .env   # fill in Supabase + Upstash credentials
npm install
npm run dev             # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
cp .env.local.example .env.local  # fill in Supabase + API URL
npm install
npm run dev              # http://localhost:3000
```

Or run everything via Docker: `docker compose -f infra/docker-compose.yml up`.

For a production deploy on free tiers, follow `docs/DEPLOYMENT.md` end to end. If you want a single-host Docker deployment, use `infra/docker-compose.prod.yml` with `infra/nginx.prod.conf`.

## Design system

Four themes (Light, Dark, Neon, Afro-Tech) are implemented as CSS custom-property sets in `frontend/styles/globals.css`, switched via a `data-theme` attribute — no component-level branching. The shared signature motif across all four is the **kente-stripe** accent bar (`bg-kente-stripe` in Tailwind config): a two-tone diagonal woven pattern used sparingly under avatars, on price tags, and as section dividers, tying the whole UI back to a shared textile identity without reproducing any specific licensed pattern.
