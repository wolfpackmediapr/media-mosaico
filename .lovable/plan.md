# Client Spotlight — Redes Sociales (30 días)

Adds a "Menciones de Clientes" section at the top of `/redes-sociales` highlighting active clients (from Configuración > Clientes) mentioned in social/RSS articles over the last **30 days**, rendered as horizontally-scrollable spotlight cards.

## UX

Position: directly under `SocialHeader`, above the last-refresh timestamp.

- Title: "Menciones de Clientes" + subtitle "Últimas menciones detectadas en feeds (30 días)"
- Collapsible (chevron toggle)
- Horizontal scroll row of cards (`snap-x`, `overflow-x-auto`)
- Each card shows: client name, category badge, mention count (30d), top 3 most-recent matching articles (title link, source, relative date in `es`), and a "Ver todas" button that fills the page search with the client name (reuses existing filter).
- Loading: 3 skeleton cards. Empty: "No hay menciones recientes de clientes."

## Data flow

1. `clients` where `is_active = true` → `id, name, category, keywords`.
2. `news_articles` last 30d, `order pub_date desc`, `limit 1000`, joined with `feed_sources(name, platform, platform_display_name, platform_icon)`.
3. Match in-memory:
   - `article.clients` JSONB contains client id or name (string or object form), OR
   - Diacritic/case-insensitive substring of client `name` or any `keywords[]` (length ≥ 3) inside `title + description`.
4. Group by client, sort articles desc by `pub_date`, keep top 3, drop clients with 0 matches, sort cards by `matchCount` desc.

React Query: `["client-spotlight","30d"]`, `staleTime: 60_000`.

## Files

New:
- `src/services/social/clientMatcher.ts` — pure `matchArticlesToClients(clients, articles, transform)` returning `ClientSpotlight[]`. Normalizes with NFD + strip diacritics; min keyword length 3.
- `src/hooks/use-client-spotlight.ts` — fetches clients + articles in parallel, runs matcher, returns React Query result.
- `src/components/social/ClientSpotlightCard.tsx` — single card (shadcn `Card`, `Badge`, `Button`, `Sparkles`/`ExternalLink` icons).
- `src/components/social/ClientSpotlightSection.tsx` — section wrapper (header, collapse, skeleton/empty/list states).

Edited:
- `src/types/social.ts` — append `ClientSpotlight` interface.
- `src/pages/RedesSociales.tsx` — render `<ClientSpotlightSection onClientSelect={(name) => setSearchTerm(name)} />` between `<SocialHeader />` and the refresh timestamp.

## Types

```ts
export interface ClientSpotlight {
  clientId: string;
  clientName: string;
  category: string;
  matchCount: number;
  articles: SocialPost[];
}
```

## Notes

- No DB schema changes; pure read + client-side matching.
- Reuses `transformArticlesToPosts` so article rows match feed styling.
- Semantic tokens only (`bg-card`, `text-primary`, `text-muted-foreground`).
- Accessibility: each card region has `aria-label="Menciones de {client}"`.

## Out of scope

- Persisting matches to `client_alerts`.
- Email/push notifications.
- Custom date-range picker (fixed 30d for v1).
