

## Add Website RSS Feeds

### Changes

**1. `supabase/functions/process-social-feeds/constants.ts`**
- Add the `WEBSITE_FEEDS` array (15 entries with `platform: "website"`) after the `SOCIAL_FEEDS` array and before `POSTS_PER_FEED`.

**2. `supabase/functions/process-social-feeds/index.ts`**
- Import `WEBSITE_FEEDS` alongside `SOCIAL_FEEDS`.
- Combine both arrays so the processing loop covers all feeds:
```
const ALL_FEEDS = [...SOCIAL_FEEDS, ...WEBSITE_FEEDS];
```
- Replace `for (const feed of SOCIAL_FEEDS)` with `for (const feed of ALL_FEEDS)`.

**3. `src/services/social/api.ts`**
- Add `'website'` to the `SOCIAL_PLATFORMS` array so the frontend queries include posts from website feeds.

**4. Redeploy**
- Deploy the updated `process-social-feeds` edge function.

### Notes
- The existing `processRssJsonFeed` and `feed-processor.ts` logic is feed-format agnostic (it processes any RSS.app JSON feed), so no changes are needed there.
- Website feed posts will appear in the Redes Sociales section alongside Twitter posts. If you want them separated into their own section in the future, that can be done as a follow-up.

