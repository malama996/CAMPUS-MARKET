# Testing Strategy

## 1. Unit testing (Jest / node:test)

Target the pure logic first — it's the highest-value, lowest-effort coverage:

- `backend/src/utils/fraud.js` → `checkListingForFraud`, `flagSuspiciousMessage`
  - price 70% below median → flagged medium
  - phone number in title/description → flagged low
  - account <24h + price >2000 ZMW → flagged high
  - normal listing → no flags
- Feed ranking formula (once extracted into `utils/ranking.js` per ROADMAP Phase 2) → verify recency decay and campus/follow bonuses order results as expected with fixed inputs

Run: `npm test` inside `backend/` (uses Node's built-in test runner, zero extra infra needed on free tier CI).

## 2. API testing

Use `supertest` against the Express app directly (no network hop, fast):

```js
import request from 'supertest';
import app from '../src/server.js';

test('POST /api/listings requires auth', async () => {
  const res = await request(app).post('/api/listings').send({ title: 'Textbook' });
  expect(res.status).toBe(401);
});
```

Cover per route:
- Happy path (valid payload → correct status + shape)
- Auth boundary (missing/invalid JWT → 401)
- Ownership boundary (editing someone else's listing → 403/404)
- Validation boundary (zod schema rejects bad payloads → 400)
- Rate limit boundary (N+1th request in window → 429)

Use a **dedicated Supabase test project** (free tier, separate from dev/prod) seeded via `database/schema.sql` + a `seed.sql` fixture, torn down between CI runs.

## 3. Frontend testing

- **Component tests** (React Testing Library): `ListingCard` renders price formatted as ZMW, like button toggles optimistically and reverts on API failure, `Feed` shows skeletons while loading and an empty state when `listings.length === 0`.
- **Visual/interaction smoke test**: Playwright script that loads `/`, waits for the feed, taps the first like button, and asserts the count incremented — catches integration breakage between frontend and a running backend.
- Mock `lib/api.js` at the module boundary for component tests; use the real backend (against the test Supabase project) for Playwright.

## 4. Manual testing checklist (pre-release)

- [ ] Sign up → complete profile → land on feed with correct school filter
- [ ] Create a listing with 1–6 images → appears in feed within a few seconds (realtime)
- [ ] Like/unlike updates count instantly and survives a page refresh
- [ ] Comment appears for other viewers without a refresh
- [ ] Follow a seller → their new listing shows a "New posts" pill on your feed
- [ ] Start a chat from a listing → message delivered in real time to the other tab/device
- [ ] Switch theme → persists after logout/login and across devices
- [ ] Throttle network to "Slow 3G" in DevTools → feed still usable, images lazy-load, no layout shift
- [ ] Attempt to edit another user's listing via direct API call → rejected (401/403)
- [ ] Post a listing priced far below category median → appears in `moderation_flags`
