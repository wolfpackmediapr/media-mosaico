## Problem

In the Feed Unificado search input (`src/components/dashboard/CombinedNewsFeedWidget.tsx`), the debounce on the search term is set to **500ms**. This fires a new query while the user is still typing, causing the list to reload mid-word, the input to feel like it "jumps", and making it hard to type a full multi-word query before results refresh.

## Fix

Single, surgical change in `src/components/dashboard/CombinedNewsFeedWidget.tsx`:

- Increase the debounce delay passed to `useDebounce(searchTerm, 500)` from **500ms → 900ms**.

That's it. No other logic touched:
- Minimum 3-character gate stays the same.
- "Search pending" indicator (already wired via `searchTerm !== debouncedSearchTerm`) keeps working and will simply show slightly longer, signaling to the user that typing is being captured.
- No changes to the query, filters, pagination, results-while-loading behavior, Prensa Digital / Redes Sociales merging, TV, Prensa Escrita, Radio, or any other component.

## Out of scope

- No changes to `useDebounce` itself (it's shared).
- No changes to the search hook, edge functions, or backend.
- No visual/UI changes.
