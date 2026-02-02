
# Plan: Improve Search Behavior in Feed Unificado

## Problem

The search feature triggers too quickly as users type, causing the news cards to constantly refresh and flicker. This creates a jarring, distracting experience.

---

## Solution

Implement a smoother, more user-friendly search behavior with:

1. **Longer debounce delay** - Increase from 300ms to 500ms
2. **Minimum character threshold** - Only search when 3+ characters are typed
3. **Visual feedback while searching** - Show a loading spinner in the search field
4. **Preserve previous results** - Keep showing current cards until new results are ready

---

## Changes Required

### File: `src/components/dashboard/CombinedNewsFeedWidget.tsx`

| Change | Description |
|--------|-------------|
| Increase debounce | Change from 300ms to 500ms |
| Add minimum length check | Only trigger search when user types 3+ characters |
| Add search indicator | Show loading spinner inside the search input when searching |
| Improve user hint | Update placeholder to indicate "Buscar (mín. 3 caracteres)..." |

**Visual Changes:**
- Search field shows a spinning loader icon when search is in progress
- Placeholder text clarifies minimum characters needed
- Cards remain stable until the final search results are ready

---

## Implementation Details

```
Search Input Behavior:
  
  User types → Wait 500ms after last keystroke → Check if 3+ chars → Trigger search → Show loader → Display results
  
  Less than 3 chars → Clear search filter → Show all results
```

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Debounce delay | 300ms | 500ms |
| Minimum characters | None | 3 characters |
| Loading feedback | None | Spinner in search field |
| Card flickering | Frequent | Minimal |

---

## Files to Modify

1. `src/components/dashboard/CombinedNewsFeedWidget.tsx` - Update search behavior and add loading indicator
