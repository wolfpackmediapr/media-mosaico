

## Fix: Auto-Updating Feeds (RSS + Social)

### Problem

The unified feed and RSS/social feeds are not updating because:

1. **No automatic scheduling**: There are no `pg_cron` jobs configured. Both `process-rss-feed` and `process-social-feeds` edge functions only run when a user manually clicks "Actualizar Feeds" in the UI.
2. **`process-rss-feed` processes ALL sources**: The edge function fetches all active `feed_sources` without filtering by platform, meaning it tries to process social media feeds as news RSS and vice versa. This wastes time and can cause errors.
3. **JWT required blocks cron**: `process-rss-feed` has `verify_jwt = true` in `config.toml`, which means a cron job calling it via HTTP would be rejected without a valid JWT.

### Solution

#### Step 1: Allow cron access to edge functions

Update `supabase/config.toml` to set `verify_jwt = false` for both `process-rss-feed` and `process-social-feeds`. The functions already require `SUPABASE_SERVICE_ROLE_KEY` internally, so they are safe.

#### Step 2: Filter feed sources by platform in `process-rss-feed`

Update the query at line ~382 in `supabase/functions/process-rss-feed/index.ts` to exclude social media platforms:

```typescript
const { data: feedSources, error: feedSourcesError } = await supabase
  .from('feed_sources')
  .select('*')
  .eq('active', true)
  .or('platform.eq.news,platform.is.null');
```

This matches the client-side filtering already done in `src/services/news/api.ts`.

#### Step 3: Set up pg_cron jobs

Create two cron jobs using `pg_cron` + `pg_net` to automatically invoke the edge functions:

- **`process-rss-feed`**: Every 30 minutes
- **`process-social-feeds`**: Every 60 minutes

These will call the edge functions via HTTP POST with the project's anon key.

### Files Changed

| File | Change |
|---|---|
| `supabase/config.toml` | Set `verify_jwt = false` for `process-rss-feed`; add `process-social-feeds` entry |
| `supabase/functions/process-rss-feed/index.ts` | Filter query to exclude social platform sources |
| SQL (via Supabase insert tool) | Create two `pg_cron` scheduled jobs |

### No Impact on Other Modules

These changes only affect the feed ingestion pipeline. No UI components, no radio/TV/prensa escrita code is touched.

