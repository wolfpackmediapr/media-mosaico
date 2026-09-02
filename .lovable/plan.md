# CP3 Auth Corrective Pass 3 — Separate Caller-Verifier and Admin Clients

Source-only pass. No deployment. Phase A is NOT run.

## What changes

### `supabase/functions/portal-sender/auth.ts` (rewritten)
Replace the single service-role client with the two-client split used by other internal Publiteca functions:

- Read `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. If any missing → `500 INTERNAL_RUNTIME_NOT_CONFIGURED`.
- `callerClient = createClient(url, anonKey, { global: { headers: { Authorization: Bearer <token> } }, auth: { persistSession: false, autoRefreshToken: false } })` — used ONLY for token verification: `callerClient.auth.getClaims(token)`, and `callerClient.auth.getUser(token)` only when claims verification itself fails.
- `adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })` — used ONLY for the privileged `has_role` RPC.
- Authorization ladder (unchanged semantics from Pass 2):
  1. Missing Bearer → `401 MISSING_AUTHORIZATION`.
  2. `getClaims` verified + `role === "service_role"` → allow; no getUser, no RPC.
  3. `getClaims` verified + `sub` → `adminClient.rpc("has_role", { _user_id: sub, _role: "administrator" })`; allow or `403 FORBIDDEN`. No getUser fallback.
  4. `getClaims` verified + no `sub` → `403 FORBIDDEN`. No fallback.
  5. `getClaims` verification fails (throw / error / no claims) → `callerClient.auth.getUser(token)`; failure → `401 INVALID_TOKEN`; success → `has_role` on `user.id` via adminClient.
- The token is never logged, echoed, or returned. No unverified JWT decoding; no string-comparison against the service-role key.

### Test seam (narrow, in-process only)
`AuthorizeDependencies` becomes `{ callerClient?: CallerAuthClient; adminClient?: AdminRoleClient }`:
- `CallerAuthClient`: `auth.getClaims(token)`, `auth.getUser(token)`.
- `AdminRoleClient`: `rpc(fn, args)`.
- Production `index.ts` still calls `authorize(request)` with no arguments — the seam is never caller-controlled.

### `supabase/functions/portal-sender/auth_test.ts` (extended)
Existing 9 authorization cases remain, re-stubbed against the split clients, plus new instrumentation asserting:
- `getClaims`/`getUser` are invoked on `callerClient` only.
- `has_role` RPC is invoked on `adminClient` only.
- Verified `service_role` → no getUser, no RPC.
- Verified non-admin → `403`, getUser never called.
- Verified claims with no `sub` → `403`, getUser never called.
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
