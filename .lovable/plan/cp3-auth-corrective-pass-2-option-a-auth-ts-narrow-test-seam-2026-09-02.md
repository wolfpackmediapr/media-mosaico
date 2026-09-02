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

## Tests — 9 cases (`auth_test.ts`, stub client counting `getClaims` / `getUser` / `rpc`)
1. missing Bearer → 401 MISSING_AUTHORIZATION
2. `getClaims` returns `{ error }` + `getUser` fails → 401 INVALID_TOKEN
3. verified `service_role` → allow, getUser and rpc counts = 0
4. verified `getClaims` admin → allow `admin:<uuid>`
5. `getClaims` throws + `getUser` admin → allow `admin:<uuid>`
6. `getClaims` failure + `getUser` non-admin → 403 FORBIDDEN
7. `getClaims` throws + `getUser` failure → 401 INVALID_TOKEN
8. verified `getClaims` non-admin → 403, getUser count = 0
9. verified claims with no `sub` → 403, getUser count = 0

Cases 2 and 7 cover the two distinct verification-failure shapes (returned error vs thrown). Verification failure (throw / error / no claims) falls back to `getUser`; a verified claim set missing `sub` is an authorization denial and must NOT reach `getUser`. Signing/canonical-request/test-vector/replay/verifier behavior is untouched and re-run.

`auth_test.ts` is test material only and is not part of the deployment bundle (runtime files: `index.ts`, `auth.ts`, `signing.ts`, `clients.ts`, `deno.json`).


## Return, then STOP
Complete `auth.ts`, exact `index.ts` diff, SHA-256 + byte count for the new `index.ts` and for `auth.ts`, the three unchanged hashes, and full test output. No deployment until you approve the reviewed source.
