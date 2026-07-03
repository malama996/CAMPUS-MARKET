# API Reference

Base URL: `https://api.campus-market.example` (or `http://localhost:4000` locally)
Auth: `Authorization: Bearer <supabase-jwt>` on all endpoints marked 🔒. Session comes from `supabase.auth.getSession()` on the frontend.

## Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/complete-profile` | 🔒 | Create the `profiles` row after Supabase signup (username, display name, school) |
| GET | `/api/auth/me` | 🔒 | Fetch the current user's profile |
| PATCH | `/api/auth/me/theme` | 🔒 | Update UI theme (`light`\|`dark`\|`neon`\|`afro-tech`) |

## Feed & Listings
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/listings/feed?cursor=&school=&category=` | optional | Cursor-paginated feed, 10/page, Redis-cached 60s |
| GET | `/api/listings/:id` | optional | Full listing detail + seller info |
| POST | `/api/listings` | 🔒 | Create a listing (rate-limited: 20/hour) |
| PATCH | `/api/listings/:id` | 🔒 owner | Update title/description/price/status/images |
| DELETE | `/api/listings/:id` | 🔒 owner | Soft-delete (sets `status = 'removed'`) |

## Social
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/listings/:id/like` | 🔒 | Like (idempotent) |
| DELETE | `/api/listings/:id/like` | 🔒 | Unlike |
| GET | `/api/listings/:id/comments` | none | List comments, oldest first |
| POST | `/api/listings/:id/comments` | 🔒 | Add a comment (rate-limited: 15/min) |
| POST | `/api/sellers/:id/follow` | 🔒 | Follow a seller |
| DELETE | `/api/sellers/:id/follow` | 🔒 | Unfollow |
| GET | `/api/sellers/:id/storefront` | none | Seller profile + active listings grid |

## Chat
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/chat/threads` | 🔒 | All threads for the current user |
| POST | `/api/chat/threads` | 🔒 | Get-or-create a thread for a listing |
| GET | `/api/chat/threads/:id/messages` | 🔒 participant | Message history (max 500) |
| POST | `/api/chat/threads/:id/messages` | 🔒 participant | Send a message (rate-limited: 30/min); realtime delivery via Supabase Realtime, not polling |

## Conventions
- All timestamps are ISO 8601 UTC.
- All money values are `numeric` ZMW, no currency conversion in v1.
- Errors: `{ "error": "human-readable message", "details"?: {...} }` with an appropriate 4xx/5xx status.
- Pagination is always cursor-based (`created_at` of the last item), never offset-based, to stay stable under concurrent writes.
