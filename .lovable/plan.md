

# Plan: Fix Platform Counts Not Updating After Refresh

## Problem Identified

The UI shows 0 counts for new feeds even though articles exist in the database. This is because:

1. React Query caches the `["social-platforms"]` query for 5 minutes
2. When `refreshFeeds()` is called, it calls `fetchPlatforms()` and `fetchPosts()` directly but does NOT invalidate the React Query cache
3. The UI continues to display stale cached data with 0 counts

---

## Solution

Update the `useSocialFeeds` hook to properly invalidate the React Query cache after refreshing feeds.

---

## Changes Required

### File: `src/hooks/use-social-feeds.ts`

Add `useQueryClient` from React Query and call `invalidateQueries` after fetching new data:

```typescript
import { useQuery, useQueryClient } from "@tanstack/react-query";
// ... existing imports

export function useSocialFeeds() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  // ... rest of state

  // Manual refresh function - updates to use process-social-feeds
  const refreshFeeds = async () => {
    try {
      setIsRefreshing(true);
      const { error } = await supabase.functions.invoke("process-social-feeds", {
        body: { 
          timestamp: new Date().toISOString(),
          forceFetch: true
        }
      });
      
      if (error) throw error;
      
      // Update last refresh time
      setLastRefreshTime(new Date());
      
      // Invalidate React Query cache to force refetch with fresh data
      await queryClient.invalidateQueries({ queryKey: ["social-platforms"] });
      await queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      
      return { success: true };
    } catch (error) {
      console.error("Error refreshing feeds:", error);
      return { success: false };
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // ... rest of hook
}
```

---

## Summary

| Aspect | Details |
|--------|---------|
| Files to modify | 1 (`src/hooks/use-social-feeds.ts`) |
| Lines changed | ~5-8 |
| Risk level | Low - no UI changes, only cache invalidation |
| Other components affected | None |

---

## Immediate Workaround

While the fix is being implemented, users can:
1. **Hard refresh the page** (Ctrl+Shift+R or Cmd+Shift+R)
2. This clears the browser cache and forces React Query to fetch fresh data

---

## After Implementation

1. Navigate to Redes Sociales
2. Click the "Actualizar" (Refresh) button
3. All 41 feeds should display correct article counts

