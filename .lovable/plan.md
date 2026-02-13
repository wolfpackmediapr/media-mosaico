

## Fix: Persistent Page Refresh/Redirect in Ajustes Section

### Root Cause

The issue stems from two interconnected problems:

1. **Stale closure in AuthContext**: The `onAuthStateChange` callback captures `session` and `isLoading` in a closure that never updates (empty `[]` dependency array). Every auth event (TOKEN_REFRESHED, SIGNED_IN) creates a new session object. Because `currentSession !== session` uses reference equality against the stale captured value, it **always** evaluates to `true`, causing unnecessary state updates with new object references on every auth event.

2. **ProtectedRoute re-triggers role check**: The `useEffect` in `ProtectedRoute` depends on `[user, authLoading]`. When AuthContext unnecessarily updates the `user` state (new reference, same user), ProtectedRoute re-enters its loading state (`isCheckingRole = true`), briefly showing a spinner and effectively "refreshing" the page content. This happens on every token refresh (~every few minutes) and on tab visibility changes.

### Fix (2 files, no database changes)

#### File 1: `src/context/AuthContext.tsx`

Replace the stale-closure-prone `onAuthStateChange` with one that uses **refs** to track current state, preventing unnecessary re-renders:

- Use a `sessionRef` to compare the actual user ID instead of object reference
- Only call `setSession`/`setUser` when the user actually changes (different ID or sign-out)
- Use a `loadingRef` to avoid the stale `isLoading` closure
- This eliminates spurious state updates from TOKEN_REFRESHED, SIGNED_IN events when the user hasn't actually changed

#### File 2: `src/components/auth/ProtectedRoute.tsx`

Cache the role check result to prevent re-fetching on every render cycle:

- Store the checked user ID alongside the role so we only re-fetch when the **actual user** changes (not just the object reference)
- Skip role re-check if we already have the role for the current `user.id`
- This eliminates the loading flash that causes the perceived "page refresh"

### What Changes for the User

- Navigating between tabs/sections within Ajustes will no longer cause unexpected redirects
- Token refresh events (which happen periodically in the background) will no longer cause page flickers
- Switching browser tabs and returning will no longer reload the page content
- All existing authentication and authorization behavior remains identical

### Technical Details

**AuthContext.tsx changes:**
```text
// Before (stale closure):
if (currentSession !== session && currentSession?.user) {
  setSession(currentSession);  // Always triggers - reference never matches
  setUser(currentSession.user);
}

// After (stable comparison via ref):
const prevUserId = sessionRef.current?.user?.id;
const newUserId = currentSession?.user?.id;
if (newUserId !== prevUserId) {
  // Only update state when the actual user changes
  sessionRef.current = currentSession;
  setSession(currentSession);
  setUser(currentSession?.user ?? null);
}
```

**ProtectedRoute.tsx changes:**
```text
// Before: re-checks on every user reference change
useEffect(() => { checkUserRole(); }, [user, authLoading]);

// After: skips if role already fetched for this user ID
useEffect(() => {
  if (user && checkedUserId === user.id && userRole) return; // skip
  checkUserRole();
}, [user, authLoading]);
```

