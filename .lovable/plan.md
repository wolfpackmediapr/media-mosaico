# CP3 Auth Corrective Pass 2 — Option A (auth.ts + narrow test seam), source only

No deploy, no Phase A, no diagnostics, no apply in this pass.

## Files
- **New:** `supabase/functions/portal-sender/auth.ts` — authorization implementation.
- **New:** `supabase/functions/portal-sender/auth_test.ts` — the eight authorization tests.
- **Changed:** `index.ts` — imports `authorize` from `auth.ts`, deletes its local `authorize` body, calls `await authorize(request)`. No other change.
- **Byte-identical:** `signing.ts` (`93cb56aa…d4d8`), `clients.ts` (`ff968cbb…c530`), `deno.json` (`4a6c1c4b…2525`).

## Shape
```
authorize(request, dependencies?)
```
`dependencies` is an in-process test seam only; production calls `await authorize(request)` and the real admin client (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, `persistSession: false`) is built internally and reused for all three calls. Typed surface: `auth.getClaims(token)`, `auth.getUser(token)`, `rpc("has_role", { _user_id, _role: "administrator" })`.

## Semantics
1. No Bearer → `401 MISSING_AUTHORIZATION`.
2. `getClaims` verified + `role === "service_role"` → allow `service_role` (no getUser, no rpc).
3. `getClaims` verified + `sub` → `has_role`; true → `admin:<uuid>`; false/error → `403 FORBIDDEN`. **No getUser retry** — authorization denial never re-enters authentication.
4. `getClaims` verified but no `sub` → `403 FORBIDDEN`.
5. `getClaims` verification fails (error or throw) → `getUser(token)`.
6. `getUser` fails / no user → `401 INVALID_TOKEN`.
7. `getUser` succeeds → `has_role(user.id, "administrator")`; true → `admin:<uuid>`; false/error → `403 FORBIDDEN`.

Invariants held: no unverified decoding, no comparison to `SUPABASE_SERVICE_ROLE_KEY`, `authenticated` alone never sufficient, fallback cannot bypass `has_role`, no token/claims logged or returned, role literal stays `"administrator"`.

## Tests
Eight Deno tests against a stub client that counts `getClaims` / `getUser` / `rpc` calls: missing header 401; both verifications fail 401; verified service_role allowed; getClaims admin allowed; getClaims fail + getUser admin allowed; getClaims fail + getUser non-admin 403; getClaims fail + getUser fail 401; **verified non-admin via getClaims → 403 with `getUser` call count asserted 0**. Plus verified-claims-without-sub → 403. Signing/canonical-request/test-vector behavior untouched and re-run.

## Return, then STOP
Complete `auth.ts`, exact `index.ts` diff, SHA-256 + byte count for the new `index.ts` and for `auth.ts`, the three unchanged hashes, and full test output. No deployment until you approve the reviewed source.
