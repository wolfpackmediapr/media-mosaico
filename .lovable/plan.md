## Buzz Words — Word Bubble Cloud (Dashboard)

Add a new interactive word-bubble visualization to the main dashboard (`/`) that surfaces the most frequent "buzz words" from RSS-driven content (`news_articles`), with Day / Week / Month filters and smooth animated transitions when the window changes.

### Where it goes
- New widget on `src/pages/Index.tsx`, placed right under `CombinedNewsFeedWidget` (full width), so it sits next to the existing feed it summarizes.
- Files created:
  - `src/hooks/use-buzz-words.ts` — data + aggregation hook
  - `src/components/dashboard/BuzzWordsCloud.tsx` — card + SVG bubble renderer
  - export added to `src/components/dashboard/index.ts`

### Library choice
- Use `d3-cloud` (layout engine only) + custom React/SVG renderer + `framer-motion` for enter/exit/transform animations.
  - `d3-cloud` handles non-overlapping spiral layout; we render the result ourselves as `<motion.text>` / `<motion.circle>` so we get true interpolated movement (bubbles "fly" to new positions when filter changes) instead of a Canvas redraw.
  - `framer-motion` is already used elsewhere in the project.
- Install: `d3-cloud` + `@types/d3-cloud`. `framer-motion` is reused if already present (otherwise add).

### Data source & aggregation
Read from `news_articles` (covers all RSS — Prensa Digital and Redes Sociales feeds), since this is the unified RSS store used by `useCombinedNewsFeed`.

Hook `useBuzzWords(range: 'day' | 'week' | 'month')`:
1. Compute `since` = now − (1d / 7d / 30d).
2. Query (React Query, key `['buzz-words', range]`, `staleTime` 60s, `refetchInterval` 5min):
   ```
   supabase.from('news_articles')
     .select('title, description, keywords')
     .gte('pub_date', since)
     .order('pub_date', { ascending: false })
     .limit(2000)
   ```
3. Build a token frequency map:
   - Prefer `keywords` array when present (already AI-extracted, highest signal).
   - Fall back to tokenizing `title + description`: lowercase, NFD-strip accents, split on non-letter, drop tokens < 4 chars, drop a Spanish + English stopword list (a, de, la, el, los, las, y, en, que, con, por, para, un, una, the, and, of, to, in, for, on, with, is, are, …), drop pure numbers.
   - Optional: also drop tokens that are exact `feed_source.name` / `source` values to avoid "elnuevodia" dominating.
4. Return top 60 `[{ text, value }]` sorted by frequency.

Reuse `MIN_KEYWORD_LEN` style logic from `src/services/social/clientMatcher.ts` for consistency. All work is in-memory; no DB schema changes.

### Component: `BuzzWordsCloud.tsx`
Layout:
```text
┌─ Card ───────────────────────────────────────────────┐
│ Buzz Words            [ Día ] [ Semana ] [ Mes ]    │
│ Tendencias de las RSS feeds en el período           │
├──────────────────────────────────────────────────────┤
│           (animated SVG bubble cloud)                │
│   word size ∝ frequency, color by frequency bucket   │
│   hover → tooltip "palabra · N menciones"            │
│   click → navigates to /prensa-digital?q=palabra     │
└──────────────────────────────────────────────────────┘
```
Behavior:
- Filter chips (`Tabs` from shadcn) controlling the `range` state; default `week`.
- Re-run `d3-cloud` layout in a `useMemo` keyed on `(words, width, range)`. Width comes from a `ResizeObserver` on the card body; height fixed (e.g. 360 px desktop, 280 px mobile).
- Each word rendered as `<motion.g>` with `layout` + `layoutId={word.text}`. When `range` changes:
  - Words present in both windows interpolate position/size/rotation.
  - New words `initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }}`.
  - Removed words exit with `AnimatePresence` (`opacity → 0, scale 0.3`).
- Sizing: linear-scale frequency to font size 12–48 px. Color via existing semantic tokens (`hsl(var(--primary))`, `--accent`, `--muted-foreground`) cycled by frequency bucket — no hard-coded hex. Respect dark mode automatically.
- Loading: skeleton bubbles (8 placeholder circles fading in/out).
- Empty: `"No hay suficientes datos en este período"`.
- Accessibility: container has `role="img"` and `aria-label="Nube de palabras de tendencias"`; each word also rendered as off-screen `<li>` in a visually-hidden list for screen readers.

### Performance notes
- Cap at 60 words after aggregation (d3-cloud cost grows quickly).
- Memoize the tokenization + layout; only recompute when the underlying query data or container width changes.
- Query limit 2000 rows is enough for a 30-day window without paginating; if a future need grows, push the aggregation into a Supabase RPC.

### Out of scope (can add later)
- Click-to-filter that drives the `CombinedNewsFeedWidget` (today it just deep-links).
- Per-client / per-platform filter chips inside the cloud.
- Sentiment-tinted bubbles.
- Custom mask shape (heart/PR map) via `wordcloud2.js`.
