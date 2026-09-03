# CP5-C4A.2D — Deploy Digital Summary Hygiene Patch

Deployment-only phase. Deploy `portal-sender` with the already-tested C4A.2 sentinel-hygiene patch. No invocation, no smoke test, no other changes.

## Pre-flight (already verified)

Local working tree SHA-256 hashes match the approved state exactly:

- `content/types.ts` — dfa69758...20d58f (the one intentional change: 6-string SUMMARY_SENTINELS)
- `content/digital.ts`, `handler.ts`, `auth.ts`, `signing.ts`, `finalize.ts`, `clients.ts`, `index.ts` — all match approved unchanged hashes

Test state from C4A.2: 73 passed / 0 failed, deno check clean.

## Steps

1. Deploy `portal-sender` only (via `supabase--deploy_edge_functions`, function list: `["portal-sender"]`). No other function is deployed.
2. Post-deploy confirmation (read-only):
   - Function is ACTIVE / deployment succeeded
   - `verify_jwt` remains `false` in `supabase/config.toml`
   - In-code authorization review logic (apply gate) unchanged — confirmed by hash match on `handler.ts`/`auth.ts`/`index.ts`
   - Test files live under `supabase/function-tests/`, not `supabase/functions/`, so they are excluded from the runtime bundle
   - Re-hash local runtime files to confirm the deployed working tree still matches approved hashes

## Explicitly NOT done

- No portal-sender invocation, no dry_run, no apply, no clients sync
- No change to `PORTAL_SENDER_ALLOW_APPLY`, `PORTAL_SENDER_TEST_MODE`, or any secret
- No DB/schema/RLS/Auth/Storage/cron changes
- No Portal contact, no post-deployment smoke test

## Technical details

- Deployment tool: `supabase--deploy_edge_functions` with `function_names: ["portal-sender"]`
- Verification: `sha256sum` of the 8 runtime files vs approved hash list
- Report will include: deployment result/timestamp, runtime hashes, changed file (`content/types.ts` only), verify_jwt state, and confirmations that no invocation, secrets/gate changes, or internal DB changes occurred.
