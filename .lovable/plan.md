## Problem

Cards still show only 3 articles because the matcher caps `maxArticlesPerClient = 3` — the scrollable container has nothing to scroll. Even if we raise the cap, cramming 6+ items inside a 440px card feels tight.

## Proposed approach — Dialog drill-in (inspired by the Radix Dialog you shared)

Keep the spotlight cards compact (3 preview items), and add a "Ver todas (N)" action that opens a polished modal listing **all** mentions for that client, scrollable, with richer metadata.

### Changes

**1. `src/services/social/clientMatcher.ts`**
- Return the full matched list on the spotlight object (e.g. add `allArticles: SocialPost[]`) while keeping `articles` capped at 3 for the card preview. No breaking change to existing callers.

**2. `src/components/social/ClientSpotlightDialog.tsx`** (new)
- Built on the existing shadcn `Dialog` primitives (same Radix base as the snippet).
- Header: `Sparkles` icon + client name, category badge, total mention count, "últimos 30 días" subtitle.
- Body: scrollable list (`max-h-[70vh] overflow-y-auto`) of every mention — title, source/platform, relative date, external link icon. Light dividers, hover state, `border-l-2 border-primary/30` accent consistent with the card.
- Footer: secondary "Cerrar" + primary "Ver en feed" (uses existing `onSelect` to route to `/redes-sociales?q=...`).

**3. `src/components/social/ClientSpotlightCard.tsx`**
- Drop the fixed `h-[440px]` and the inner `overflow-y-auto` (no longer needed).
- Show 3 preview items as today.
- Replace "Ver todas" ghost button with one that opens `ClientSpotlightDialog` for that client. Label becomes `Ver todas (N)` using `matchCount`.
- Keep optional `onSelect` for the dialog's "Ver en feed" action.

**4. `src/components/social/ClientSpotlightSection.tsx`**
- No structural change. Pass `onSelect` through to cards as today.

## Visual direction (from your snippet)

- Overlay: `bg-black/80 backdrop-blur-sm` with fade-in.
- Content: centered, `max-w-2xl`, rounded-lg, border, shadow-lg, zoom/slide-in animation, top-right `X` close button — matches the Radix pattern you pasted and the project's existing shadcn dialog styling.

## Out of scope

- Pagination beyond the existing 1000-article / 30-day window
- Search/filter inside the dialog
- Persisting "last viewed" state
