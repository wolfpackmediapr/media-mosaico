# CP3 Auth Corrective Pass 2 — getUser() fallback (source only, no deploy)

## Scope
Change the authorization logic used by `portal-sender` only. No deploy in this pass, no Phase A, no diagnostics, no apply.

Untouched: `signing.ts`, `clients.ts`, `deno.json`, HMAC canonicalization, batching, diagnostics gates, apply triple gate, Portal config, secrets, database objects, `verify_jwt=false`.

## New authorization ladder
1. No `Authorization: Bearer` → `401 MISSING_AUTHORIZATION`.
2. `admin.auth.getClaims(token)`:
   - success and `claims.role === "service_role"` → allow, `actor = "service_role"`.
   - success with `claims.sub` → `has_role(sub, "administrator")`; true → allow `actor = admin:<uuid>`, else `403 FORBIDDEN`.
   - success but no `sub` → `403 FORBIDDEN`.
3. `getClaims` throws / returns error / no claims → fallback `admin.auth.getUser(token)`:
   - error or no user → `401 INVALID_TOKEN`.
   - user present → `has_role(user.id, "administrator")`; true → allow `actor = admin:<uuid>`, else `403 FORBIDDEN`.

No unverified JWT decoding, no string comparison against `SUPABASE_SERVICE_ROLE_KEY`. One `admin` client created once and reused for `getClaims`, `getUser`, and the `has_role` RPC (today the file builds it twice — that duplication is removed as part of the same function).

## Testability decision (needs your call)
`index.ts` calls `Deno.serve(...)` at module load, so a Deno test cannot import `authorize` from it without starting a listener.

- **Option A (recommended):** move `authorize` into a new `supabase/functions/portal-sender/auth.ts`, exported and accepting an injectable admin-client factory (default = real `createClient`). `index.ts` then imports and calls it. Adds a fifth file; the other three approved hashes stay unchanged; `index.ts` diff stays small (import line + one call site removed body).
- **Option B:** keep `authorize` inside `index.ts` and test it by booting the served function over HTTP with stubbed env/network. Zero new files, but heavier and less precise tests.

## Tests (`*_test.ts`, Deno)
Stubbed admin client covering: missing header → 401 MISSING_AUTHORIZATION; both verifications fail → 401 INVALID_TOKEN; verified `service_role` claims → allowed; getClaims + administrator → allowed; getClaims failure + getUser success + administrator → allowed; getClaims failure + getUser success + non-admin → 403 FORBIDDEN; getClaims failure + getUser failure → 401 INVALID_TOKEN. Plus the existing signing/test-vector behavior re-verified via `verifyTestVector()` and a canonical-request assertion.

## Report returned, then STOP
Exact `index.ts` diff, new byte count and SHA-256 for `index.ts`, confirmation `signing.ts` / `clients.ts` / `deno.json` hashes are unchanged, and full test output. No deployment until you approve the reviewed source.
