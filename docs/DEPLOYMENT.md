# Deployment Guide (all free tier)

## 1. Supabase (database + auth + storage)

1. Create a project at supabase.com → note the **Project URL**, **anon key**, and **service_role key** (Project Settings → API).
2. Open the SQL editor → paste and run `database/schema.sql`.
3. Storage → create a bucket named `listing-images`, set it **public** (read-only public access is fine; writes still require a signed URL from the backend).
4. Authentication → enable **Email OTP** (and Phone OTP later if you add an SMS provider) under Providers.
5. Authentication → URL configuration → add your Vercel domain to Redirect URLs once you have it (step 3 below).

## 2. Upstash Redis (cache + rate limiting)

1. Create a free Redis database at upstash.com (choose a region close to your Render/Railway region to minimize latency).
2. Copy the **REST URL** and **REST Token** from the database details page — these go into the backend env, not the classic Redis connection string.

## 3. Backend → Render (or Railway)

**Render:**
1. New → Web Service → connect the repo, set root directory to `backend/`.
2. Build command: `npm ci`. Start command: `npm start`.
3. Environment variables (copy from `backend/.env.example`):
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `FRONTEND_ORIGIN` = your Vercel URL (set after step 4, redeploy to update)
   - `NODE_ENV=production`
4. Free tier note: the service sleeps after inactivity — first request after idle takes 30–60s. Acceptable for an MVP; see ARCHITECTURE.md scaling table for the fix (paid dyno) once traffic justifies it.

**Railway** is a drop-in alternative: New Project → Deploy from repo → set root to `backend/` → same env vars → Railway auto-detects the Node start command.

## 4. Frontend → Vercel

1. Import the repo into Vercel, set root directory to `frontend/`.
2. Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_API_BASE_URL` = your Render/Railway backend URL from step 3
3. Deploy. Vercel gives you a `*.vercel.app` domain immediately and a fresh preview URL per pull request.
4. Go back to Render/Railway and set `FRONTEND_ORIGIN` to this Vercel URL, then redeploy the backend so CORS allows it.
5. Go back to Supabase Auth → URL configuration and add the Vercel URL as an allowed redirect.

## 5. Domain setup (optional)

- Buy a `.co.zm` or `.com` domain from any registrar.
- In Vercel: Project → Domains → add your domain, follow the CNAME/A record instructions shown.
- Update `FRONTEND_ORIGIN` (backend) and Supabase redirect URLs to the new domain once DNS propagates.

## 6. Environment variable summary

| Var | Where | Value source |
|---|---|---|
| `SUPABASE_URL` | backend | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | backend only, never frontend | Supabase → Settings → API |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | backend | Upstash dashboard |
| `FRONTEND_ORIGIN` | backend | your Vercel/custom domain |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | frontend | Supabase → Settings → API |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_API_BASE_URL` | frontend | your Render/Railway backend URL |
