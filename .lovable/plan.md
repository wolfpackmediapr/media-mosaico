# Replace Chente Ydrach feed (Twitter → Instagram)

Swap the existing Chente Ydrach Twitter/X RSS feed for his Instagram feed, since he no longer uses X.

## Changes

- `supabase/functions/process-social-feeds/constants.ts`
  - Update the Chente Ydrach entry:
    - `url`: `https://rss.app/feeds/v1.1/5Z7XBW9taSumsxWw.json`
    - `platform`: `instagram`
    - `name`: unchanged ("Chente Ydrach")

## Data cleanup (SQL migration)

Update the existing `feed_sources` row for Chente Ydrach in place so historical `news_articles` remain linked:
- Set `url` to the new Instagram RSS URL
- Set `platform` to `instagram`
- Reset `last_successful_fetch`, `last_fetch_error`, `error_count`

## Verification

- Invoke `process-social-feeds` with `forceFetch: true`.
- Confirm new Instagram posts ingest under Chente Ydrach and the Redes Sociales UI shows the Instagram badge.
