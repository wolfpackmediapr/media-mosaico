
## Move Website Feeds to Prensa Digital and Fix Feed Update

### Problem
The 15 website RSS feeds were incorrectly added to the "Redes Sociales" pipeline with `platform: "website"`. They should belong to "Prensa Digital" instead. Additionally, the Prensa Digital news sources haven't been refreshed since January 13 -- nearly a month ago.

### Changes

**1. Update database: Change platform from "website" to "news"**
- Run a SQL update on the `feed_sources` table to change the `platform` column from `"website"` to `"news"` for all 15 website feeds.
- This single change makes them visible in the Prensa Digital section (which filters for `platform = 'news'` or `null`) and invisible in Redes Sociales.
- The existing articles from these feeds will also need their feed source platform updated -- since the join is by `feed_source_id`, they will automatically appear in Prensa Digital once the source platform changes.

**2. `supabase/functions/process-social-feeds/constants.ts`**
- Remove the entire `WEBSITE_FEEDS` array (the 15 entries).
- Remove the export of `WEBSITE_FEEDS`.

**3. `supabase/functions/process-social-feeds/index.ts`**
- Remove the `WEBSITE_FEEDS` import.
- Revert the loop back to only process `SOCIAL_FEEDS` (remove the `ALL_FEEDS` combination).

**4. `src/services/social/api.ts`**
- Remove `'website'` from the `SOCIAL_PLATFORMS` array.

**5. Redeploy `process-social-feeds` edge function**

### How Prensa Digital Will Pick Up the Feeds
The `process-rss-feed` edge function (Prensa Digital) already queries ALL active feed sources from the database (no platform filter). Once the 15 feeds have `platform: "news"`, they will:
- Be processed by `process-rss-feed` on the next refresh (with AI analysis, sentiment scoring, and client matching)
- Appear in the Prensa Digital UI (which filters for `platform = 'news'` or `null`)

### Prensa Digital Feed Update Issue
The 5 original Prensa Digital news sources (El Nuevo Dia, El Vocero, Metro PR, Noticel, Primera Hora) haven't been refreshed since January 13. After implementing these changes, we will trigger a manual refresh to verify everything works.
