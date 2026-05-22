## Goal
Add the existing `ClientSpotlightSection` to the Inicio (`/`) dashboard, mixing both **Prensa Digital** and **Redes Sociales** mentions — same data universe as the Feed Unificado widget.

## Why this is simple
The `useClientSpotlight` hook already supports `scope="all"`, which queries `news_articles` from the last 30 days without filtering `feed_sources.platform`. Since both Prensa Digital (RSS) and Redes Sociales (Twitter/X via RSS.app) live in `news_articles`, `scope="all"` naturally produces the mixed view we want — exactly matching the Feed Unificado data source.

No new hook, no new matcher, no DB changes.

## Changes

### `src/pages/Index.tsx`
1. Import `ClientSpotlightSection` from `@/components/social/ClientSpotlightSection`.
2. Render it between the Stats Grid (line 115) and the Combined News Feed (line 118):

```tsx
<ClientSpotlightSection
  scope="all"
  onClientSelect={(name) => navigate(`/redes-sociales?q=${encodeURIComponent(name)}`)}
/>
```

Since the Inicio page doesn't have a local search state to fill, `onClientSelect` routes the user to `/redes-sociales` (or alternatively `/prensa-digital`) with the client name in the query. If those pages don't currently read `?q=`, the simplest fallback is to just `navigate('/redes-sociales')` without a query and let the user search there — or drop `onClientSelect` entirely so only the card content is shown.

### No other files change
- `ClientSpotlightSection` is already reusable and handles loading/empty/collapsed states.
- `ClientSpotlightCard` already renders source name + relative date and works for both news and social rows because both come from `news_articles` with the same `feed_source` join.

## Visual placement
```text
[Header: Bienvenido + Date Range]
[Quick Actions]
[Stats Grid: 7 cards]
[Menciones de Clientes — mixed feed, 30d]   ← NEW
[Feed Unificado]
[Charts row]
...
```

## Out of scope
- Adding `?q=` search-from-URL support to Prensa/Redes pages (can be a follow-up).
- Persisting matches, notifications, custom date range.
- Including Prensa Escrita (`press_clippings`) — current scope is the same universe as Feed Unificado.
