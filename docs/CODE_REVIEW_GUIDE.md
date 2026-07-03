# Code Review Guide (pre-deployment checklist)

## Correctness
- [ ] Every new route has a zod schema validating its input (see `backend/src/routes/*.js` for the pattern)
- [ ] Every mutation checks ownership (`.eq('seller_id', req.user.id)` style) even though RLS also enforces it — defense in depth
- [ ] No `select('*')` on tables with sensitive columns exposed to the client; be explicit about returned fields

## Performance
- [ ] New list endpoints are cursor-paginated, never `SELECT *` without a `LIMIT`
- [ ] Hot read paths (feed, storefront) are cache-checked against Redis before hitting Postgres
- [ ] Images are never returned as base64 in API responses — Storage URLs only
- [ ] No N+1 queries: use Supabase's nested `select()` (as in `listings.js`) instead of looping and querying per row

## Security
- [ ] New tables have RLS enabled and explicit policies (default-deny is correct for anything not intentionally public)
- [ ] Service-role Supabase key (`SUPABASE_SERVICE_ROLE_KEY`) never appears in any file under `frontend/`
- [ ] User-supplied strings that render as HTML are never `dangerouslySetInnerHTML`'d without sanitizing
- [ ] Rate limits exist on every write endpoint a spammer could hit for free (comments, likes are idempotent so lower risk; listing creation and chat sends are higher risk)
- [ ] File uploads are validated server-side for MIME type and size before a signed URL is issued

## Bandwidth / mobile-first
- [ ] New images ship at reasonable resolution (Supabase Storage image transforms, max 1080px wide for feed thumbnails)
- [ ] No new client-side dependency added without checking its bundle size impact (`npx next build` and check the route's First Load JS)
- [ ] Loading states exist for anything that fetches — no blank white screens

## Before merging to `main`
1. `npm run lint` clean in both `frontend/` and `backend/`
2. `npm test` passes in `backend/`
3. Manual smoke test against a preview deploy (Vercel auto-generates one per PR)
4. Migration files in `database/` are additive/backward-compatible (see MODIFICATION_GUIDE.md) so a rollback of the app code doesn't break on the new schema
