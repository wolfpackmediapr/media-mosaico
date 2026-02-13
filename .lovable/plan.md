

## Fix: ProtectedRoute Redirects Admin Before Role Check Completes

### Root Cause

In `ProtectedRoute.tsx`, the state `isCheckingRole` initializes as `false`. On the very first render:

1. `authLoading` is `false` (auth already resolved)
2. `isCheckingRole` is `false` (hasn't started yet)
3. `userRole` is `null` (hasn't been fetched yet)
4. The guard `if (authLoading || isCheckingRole)` passes through
5. Line 90 checks `adminOnly && userRole !== 'administrator'` -- since `userRole` is `null`, this is `true`
6. The component redirects to `/` before the `useEffect` even fires

Admins get kicked out instantly. Data entry users also get redirected, but that happens to be the correct behavior for them, so it was never noticed.

### Fix (1 file)

**File: `src/components/auth/ProtectedRoute.tsx`**

Two small changes:

1. Initialize `isCheckingRole` to `true` instead of `false` -- this ensures the loading spinner shows until the first role check completes
2. Reset it properly in the useEffect early-return path

This ensures the component waits for the role to be fetched before making any admin access decision.

### Technical Details

```text
// Before (broken):
const [isCheckingRole, setIsCheckingRole] = useState(false);
// First render: isCheckingRole=false, userRole=null -> redirects admin to /

// After (fixed):
const [isCheckingRole, setIsCheckingRole] = useState(true);
// First render: isCheckingRole=true -> shows spinner, waits for role check
// useEffect runs, fetches role, sets isCheckingRole=false -> admin proceeds
```

In the early-return guard of the useEffect (when role is already cached), we set `isCheckingRole = false` so subsequent renders don't get stuck on the spinner.

### What Changes for the User

- Administrators can access Configuracion again
- Data entry users are still blocked (correct behavior)
- A brief loading spinner shows while the role is verified (same as before, but now it actually works)
