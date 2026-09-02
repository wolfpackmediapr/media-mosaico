# CP3 Auth Compatibility Corrective Pass — Config Only

## What changes
- `supabase/config.toml`: `[functions.portal-sender] verify_jwt = true` → `verify_jwt = false`.
- Redeploy only `portal-sender` with the exact same four approved source files (no source edits).

## Why
- The platform gateway's `verify_jwt=true` layer rejects the structurally valid admin session JWT (`HS256`, 3 segments, `kid` present) with `401 UNAUTHORIZED_INVALID_JWT_FORMAT` before `portal-sender` executes.
- The sender's own mandatory authorization remains intact and is the security boundary: it requires `Authorization: Bearer <token>`, cryptographically verifies via `auth.getClaims(token)`, and accepts only verified `role=service_role` or a verified admin via `has_role(sub, "administrator")` — rejecting before any source read or Portal request.

## Explicitly NOT changed
- `index.ts`, `signing.ts`, `clients.ts`, `deno.json` — untouched.
- HMAC protocol, Portal secrets, `PORTAL_SENDER_ALLOW_APPLY=false`, `PORTAL_SENDER_TEST_MODE=false` — unchanged.
- No database schema, RLS, or other Edge Function changes.
- Phase A is NOT run in this pass.

## Verification after redeploy
1. Re-hash all four installed files and confirm exact matches:
   - `index.ts` = `015e74711179eb0e08f11a36f6285f2c37f3547ccf83474b232e4fabfe18f164`
   - `signing.ts` = `93cb56aa76a569efcc9b44462b524dd6003bb8be9fb07a7c5645e77b64b9d4d8`
   - `clients.ts` = `ff968cbb9a9de73158bb4b4d521fedca7aa7f8ba9391c85ccfe2e5843299c530`
   - `deno.json` = `4a6c1c4b96c387096016efe0d22052392a9135abcc01b59d4196f3c1913b2525`
2. Report: function version, ACTIVE status, `verify_jwt=false`, hash confirmations.
3. STOP — no Phase A invocation until independently verified that only the platform auth config changed.

## Technical details
- Config edit is one line in `supabase/config.toml` (lines 5–6).
- Deploy via the edge-function deployment tool for `portal-sender` only on project `qpozetnbnzdinqkrafze`.
