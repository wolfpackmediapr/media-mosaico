# CP3 Auth Corrective Pass 3 — Separate Caller-Verifier and Admin Clients

Source-only pass. No deployment. Phase A is NOT run.

## What changes

### `supabase/functions/portal-sender/auth.ts` (rewritten)
Replace the single service-role client with the two-client split used by other internal Publiteca functions:

- Read `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. If any missing → `500 INTERNAL_RUNTIME_NOT_CONFIGURED`.
- `callerClient = createClient(url, anonKey, { global: { headers: { Authorization: Bearer <token> } }, auth: { persistSession: false, autoRefreshToken: false } })` — used ONLY for normal-user token verification: `callerClient.auth.getClaims(token)`, and `callerClient.auth.getUser(token)` only when that claims verification itself fails.
- `adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })` — used for the service-role recognition check and the privileged `has_role` RPC.
- Authorization ladder:
  1. Missing Bearer → `401 MISSING_AUTHORIZATION`.
  2. Service-role automation path: `adminClient.auth.getClaims(token)`. If verified and `role === "service_role"` → allow `actor = service_role` (no getUser, no RPC). If it fails, has no claims, or the role is not `service_role`, do NOT reject — fall through to step 3. Non-service-role claims from this check are never used as a user authorization decision.
  3. Normal-user verification: `callerClient.auth.getClaims(token)`. Verified + `sub` → `adminClient.rpc("has_role", { _user_id: sub, _role: "administrator" })`; true → allow `admin:<uuid>`, false/error → `403 FORBIDDEN`. Verified with no `sub` → `403 FORBIDDEN`, no getUser fallback.
  4. Only when step 3's `getClaims` throws / returns an error / returns no claims → `callerClient.auth.getUser(token)`. Failure or no user → `401 INVALID_TOKEN`. Success → `has_role` on the verified `user.id` via adminClient; admin → allow `admin:<uuid>`, otherwise `403 FORBIDDEN`.
- Security invariants: never decode/trust an unverified JWT; never string-compare the token with `SUPABASE_SERVICE_ROLE_KEY`; `authenticated` role alone is never sufficient; a failed admin-role check never falls back to another authentication path; the token is never logged, echoed, or returned; the anon client is never used for the privileged RPC.

### Test seam (narrow, in-process only)
`AuthorizeDependencies` becomes `{ callerClient?: CallerAuthClient; adminClient?: AdminClient }`:
- `CallerAuthClient`: `auth.getClaims(token)`, `auth.getUser(token)`.
- `AdminClient`: `auth.getClaims(token)`, `rpc(fn, args)`.
- Production `index.ts` still calls `authorize(request)` with no arguments — the seam is never caller-controlled.

### `supabase/functions/portal-sender/auth_test.ts` (extended)
Existing 9 authorization cases remain, re-stubbed against the split clients, plus routing assertions:
- Verified `service_role` is recognized through `adminClient.auth.getClaims` → caller getClaims = 0, caller getUser = 0, admin RPC = 0.
- Normal-user verification goes through `callerClient.auth.getClaims`; fallback through `callerClient.auth.getUser`.
- Administrator role lookup always goes through `adminClient.rpc`.
- Verified non-admin → `403`, caller getUser = 0.
- Verified user claims without `sub` → `403`, caller getUser = 0.
- Invalid token through both user verification mechanisms → `401 INVALID_TOKEN`.
- Signing regression tests (test vector, eight-line canonical request) unchanged and green.

## Explicitly NOT changed
- `index.ts`, `signing.ts`, `clients.ts`, `deno.json` — untouched.
- `supabase/config.toml` (`verify_jwt = false`), `PORTAL_SENDER_ALLOW_APPLY=false`, `PORTAL_SENDER_TEST_MODE=false` — unchanged.
- No deployment; no Phase A invocation.

## Verification
1. Run the full Deno test suite for `portal-sender`; all 9 authorization cases + client-routing assertions + 2 signing regressions green.
2. `deno check` on `index.ts` and `auth.ts`.
3. Report SHA-256 hashes and byte counts for all files; confirm `index.ts`/`signing.ts`/`clients.ts`/`deno.json` hashes are unchanged from the approved set:
   - `signing.ts` = `93cb56aa76a569efcc9b44462b524dd6003bb8be9fb07a7c5645e77b64b9d4d8`
   - `clients.ts` = `ff968cbb9a9de73158bb4b4d521fedca7aa7f8ba9391c85ccfe2e5843299c530`
   - `deno.json` = `4a6c1c4b96c387096016efe0d22052392a9135abcc01b59d4196f3c1913b2525`
4. Return complete `auth.ts`, exact diff summary, and test output. STOP for independent review.

## Technical details
- Root cause addressed: the internal project's Auth server accepts the browser admin JWT on `/auth/v1/user` when the request carries the anon key with the caller's `Authorization` header; verification via a service-role-keyed client is what produced `INVALID_TOKEN`. Splitting caller-verification (anon + caller token) from privileged role lookup (service role) matches the platform's expectations.
- Client routing is proven by per-client call counters in the test stubs.
- After a later deployment, Phase A is still not run first: an auth-only probe `{"mode":"AUTH_PROBE_ONLY"}` is expected to return `400 INVALID_MODE`, proving authentication + administrator authorization succeeded before any client rows are read or any Portal request is made.
