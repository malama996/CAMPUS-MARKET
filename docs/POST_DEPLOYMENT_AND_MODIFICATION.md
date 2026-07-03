# Post-Deployment Verification, Load Testing & Modification Guide

## 1. Verifying the live system

1. `GET https://your-backend/health` → expect `{"status":"ok"}` within a few seconds (first hit may be slow due to free-tier cold start).
2. Open the live Vercel URL → sign up with a real email → confirm the OTP arrives and profile completion works.
3. Post a listing with a photo → confirm it appears in Supabase Table Editor (`listings` table) and in the feed UI.
4. Open the app in two browser windows as two different users → like/comment/chat in one → confirm the other updates live without a refresh (proves Realtime is wired correctly in production).

## 2. Basic load testing

Use `autocannon` (free, npm) against the backend before a launch/marketing push:

```bash
npx autocannon -c 20 -d 30 https://your-backend.onrender.com/api/listings/feed
```
- Watch for `5xx` responses and rising latency — usually means Redis or Postgres connection limits are being hit.
- Free-tier Supabase caps concurrent connections; the Express backend should be using a single pooled `supabaseAdmin` client (as it does — see `config/supabase.js`), not creating a client per request.
- If p99 latency climbs under load, check the Redis cache hit rate first (feed reads should mostly be cache hits at 60s TTL).

## 3. Debugging production issues

- Render/Railway: check the service's **Logs** tab first — the Express error handler logs the full error server-side even though it hides details from the client response.
- Supabase: **Logs & Reports** → Postgres logs show slow queries; **API logs** show RLS policy rejections (look for 401/403 patterns if a feature "silently" stops working for users).
- Vercel: **Deployments → Functions/Logs** for any server-side Next.js errors; browser console + Network tab for client-side issues (CORS misconfig shows up here first).
- Common first-week issue: `FRONTEND_ORIGIN` mismatch after a custom domain change → CORS errors in browser console → fix by updating the backend env var and redeploying.

## 4. Modification guide — adding a feature safely

1. **Schema changes**: add a new migration file `database/migrations/00X_description.sql` rather than editing `schema.sql` in place once the app is live. Keep changes additive (`ADD COLUMN ... DEFAULT`) so old backend code deployed a minute earlier doesn't crash on missing columns during a rolling deploy.
2. **New API route**: add it under `backend/src/routes/`, register in `server.js`, write the zod schema first, add RLS policy if it's a new table, add an entry to `docs/API_DESIGN.md`.
3. **New frontend surface**: add a route under `frontend/app/`, reuse `lib/api.js` for backend calls, reuse `ThemeProvider`/design tokens from `styles/globals.css` — never hardcode a color, always use the CSS variables so all four themes stay consistent.
4. **Feature-flagging risky changes**: for anything you're not sure about, gate it behind a simple `NEXT_PUBLIC_FEATURE_X=true` env var check rather than a merge-and-hope — free to do, easy to roll back by toggling the Vercel env var.

## 5. Versioning strategy

- `main` is always deployable (Vercel/Render auto-deploy from it).
- Feature branches → PR → Vercel preview URL for manual QA → merge.
- Tag releases (`v1.0.0`, `v1.1.0`...) at meaningful milestones (see ROADMAP.md phases) so you can `git checkout` a known-good state if a deploy goes wrong.
- Database migrations are numbered and applied in order; never edit a migration that has already run in production — write a new one to correct it.
