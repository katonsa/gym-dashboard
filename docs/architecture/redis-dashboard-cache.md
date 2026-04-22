# Redis Dashboard Cache

Status: Active - optional runtime optimization for dashboard reads.

The app can use Upstash Redis as a shared cache for selected owner-scoped
dashboard read models. Redis is not required for local development or tests. If
the Upstash environment variables are missing, the cache layer is bypassed and
loaders read directly from Postgres.

## Configuration

Set these server-only variables in `.env` or the deployment environment:

```bash
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
CACHE_KEY_PREFIX="gym-dashboard"
```

`CACHE_KEY_PREFIX` is optional. Use a different prefix when multiple
deployments share the same Redis database.

Do not expose these values with `NEXT_PUBLIC_`. They are used only by server
code.

## Implementation

The cache wrapper lives in `lib/cache/redis.ts`.

It provides:

- `getCachedDashboardData()` for read-through caching.
- `invalidateDashboardCache()` for gym-scoped invalidation.

The wrapper creates an Upstash client with `Redis.fromEnv()` only when both
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present. Redis read,
write, and invalidation failures are logged and do not block dashboard reads or
successful mutations.

## Cached Data

The cache is used for high-value dashboard summary and lookup data in
`lib/dashboard/loaders.ts`:

| Loader                             | Cache segment            |
| ---------------------------------- | ------------------------ |
| `loadOverviewSummary()`            | `overview-summary`       |
| `loadOverviewAlerts()`             | `overview-alerts`        |
| `loadOverdueAgingSummary()`        | `overdue-aging-summary`  |
| `loadSubscriptionSummary()`        | `subscription-summary`   |
| `loadDropInSummary()`              | `drop-in-summary`        |
| `loadDropInVisitorLookupOptions()` | `drop-in-visitor-lookup` |
| `loadSetupChecklistData()`         | `setup-checklist`        |

Paginated pages and member detail history remain direct database reads so
search, pagination, and detail views stay simple and fresh.

## Key Shape

Cache keys include:

- Application prefix.
- Dashboard namespace.
- Gym id.
- Gym cache version.
- Loader segment.
- Stable serialized loader params.

Including the gym id keeps owner data isolated. Including the gym cache version
lets mutations invalidate all existing cache entries for that gym without
scanning Redis keys.

## TTL And Invalidation

Cached entries use a short default TTL of 60 seconds. This limits stale data if
an invalidation call fails.

Server actions call `invalidateDashboardCache(gymId)` after successful writes,
then continue to call `revalidatePath()` for the affected App Router routes.
Invalidation increments the gym cache version, so later reads use a new key and
old entries expire naturally.

Current invalidation points include:

- Gym creation and gym settings updates.
- Plan tier create, update, and deactivate actions.
- Member create, status, contact, check-in, import, plan-change, and renewal
  actions.
- Payment mark-paid and void actions.
- Drop-in creation.

## Local Development

For normal local setup, leave the Upstash variables blank. This keeps the local
stack limited to Postgres and avoids requiring a network-backed Redis database.

To test the cache locally:

1. Create an Upstash Redis database.
2. Copy the REST URL and REST token into `.env`.
3. Restart `npm run dev`.
4. Exercise dashboard pages and mutation flows.

Use `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` before
shipping changes to the cache wrapper or cached loaders.
