## Diagnosis

Data confirms permissions save correctly (verified in `user_section_permissions`). The problem is that the **frontend gate lets some navigations through anyway**. Four concrete gaps found:

1. **`ProtectedRoute` treats "not yet loaded" as allowed.** The state `allowedSections` starts as `null`, and the guard reads `allowedSections && !allowedSections.has(section)`. When it is `null` (before the async fetch resolves, or if the safety 6s timer fires early, or if the early-return branch `checkedUserId === user.id && userRole` runs without having populated it) the expression is falsy and the route renders. Result: a `data_entry` user can briefly land on a blocked page.

2. **Publiteca sub-routes are all gated by a single `publiteca` section.** `/publiteca/tv`, `/publiteca/radio`, `/publiteca/redes-sociales`, `/publiteca/prensa` all share `section="publiteca"`. A user whose TV / Radio / Redes checkboxes are OFF but who has Publiteca ON can still open TV / Radio / Redes content via the Publiteca sub-tabs. Admins reasonably read this as "block didn't work."

3. **`Ayuda` and settings shell are exempt but shouldn't hide `Radio`/`TV`/etc. sub-links.** Not blocking — worth mentioning. No change unless requested.

4. **Direct URL navigation isn't blocked while the role check is still resolving.** The loader hides it in the happy path, but if the profile fetch throws (non-PGRST116), `userRole` stays null, `allowedSections` stays null, the finally clears the spinner, and the child renders. `!user` redirect only catches unauthenticated users.

## Fix plan

### 1. Harden `src/components/auth/ProtectedRoute.tsx`
- Initialize `allowedSections` as `null` but treat `null` for a non-admin `data_entry` user as **still loading, not allowed**. Concretely: keep `isCheckingRole = true` until `allowedSections` is set (or role is confirmed admin).
- Remove the early-return short-circuit that skips permission loading when `checkedUserId === user.id`; instead cache role+permissions together, or always await both.
- If `userRole` load fails, redirect to `/` instead of rendering children.
- Reduce the safety timeout to only clear `isCheckingRole` when we have concrete data; on timeout with no data, redirect to `/auth` instead of rendering.

### 2. Per-sub-route gating for Publiteca
Update `src/routes/publitecaRoutes.tsx` so each sub-route requires **both** `publiteca` AND its media section:
- `/publiteca/tv` → require `publiteca` AND `tv`
- `/publiteca/radio` → require `publiteca` AND `radio`
- `/publiteca/redes-sociales` → require `publiteca` AND `redes-sociales`
- `/publiteca/prensa` → require `publiteca` AND (`prensa` OR `prensa-escrita`)

Implementation: extend `ProtectedRoute` to accept `sections?: SectionKey[]` (all required) alongside existing `section`, or add `requireAll` variant. Sidebar sub-links in Publiteca should also respect these.

### 3. Verify enforcement with Playwright
After build, log in as `Alejandra` (permissions: only `inicio`) using the pre-injected Supabase session tools, then:
- Attempt `GET /tv`, `/radio`, `/prensa`, `/publiteca/tv` directly via URL.
- Confirm each redirects to `/` (screenshot each).
- Confirm sidebar shows only Inicio + Ayuda + (bottom items appropriate for role).

### 4. Small cleanup
- Consolidate the duplicated permission-fetching logic between `ProtectedRoute` and `useSectionPermissions` — have `ProtectedRoute` consume the hook so there is one source of truth and caching is shared.

## Out of scope
- No DB or RLS changes (data layer is correct).
- No changes to admin-only routes (`/ajustes`, `/media-monitoring`, etc.).
- No changes to how permissions are edited in the users form.

## Files to touch
- `src/components/auth/ProtectedRoute.tsx` (main fix)
- `src/hooks/use-section-permissions.ts` (expose loading state, allow multi-section check)
- `src/routes/publitecaRoutes.tsx` (per-sub-route sections)
- `src/components/publiteca/*` sidebar/tab component (if it lists sub-tabs) — hide items the user can't access
- Playwright verification script under `/tmp/browser/perm-check/`