# Campus Market — System Design

## 1. Architecture Overview
**Pattern**: Modular Monolith  
**Frontend**: Next.js 14 App Router, Tailwind CSS, Shadcn UI, Zustand  
**Backend**: Node.js/Express  
**Database**: PostgreSQL (hosted on Supabase)  
**Caching**: Redis (hosted on Upstash in prod)  

## 2. Free Tier & Multi-Institution Support
- **Scope**: Hardcoded to Copperbelt Province institutions.
- **Free Tier Constraint**: Active listings capped at 5 per user via `freeTier.js` middleware.
- **SaaS Hook**: Premium tier bypasses this limit (prep for future).

## 3. Resilience Mechanisms
- **Circuit Breakers**: Wraps external API calls (e.g., AI similarity). If the AI provider fails, it skips the HTTP call and instantly falls back to keyword matching.
- **Retries**: Jittered exponential backoff for transient AI failures.
- **Graceful Degradation**: 
  - If Redis fails, `cache-aside` endpoints (feed, institutions) fall back to DB queries.
  - If DB fails on institutions, it returns a static fallback array.

## 4. Security & Fraud Detection
- **Rate Limiting**: Applied strictly to auth, creation, and reporting.
- **Fraud Rules**: `fraud.js` scans listings asynchronously for phone numbers (platform bypass), payment keywords, and prices suspiciously below category medians. It inserts into `moderation_flags` without blocking the request.

## 5. Deployment
- Dev: `docker-compose.yml` spins up Redis, Node.js backend, Next.js frontend, and NGINX routing.
- Prod: Designed to be deployed on Vercel (FE) + Render (BE) + Supabase (DB).
