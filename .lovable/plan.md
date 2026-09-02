# CP3 Phase B — Disable Diagnostic Window

## What changes
- `PORTAL_SENDER_TEST_MODE` updated to `false`.
- No source changes.
- No deployment.
- No `portal-sender` invocation.

## Kept unchanged
- `PORTAL_SENDER_ALLOW_APPLY=false`
- `supabase/config.toml`: `[functions.portal-sender] verify_jwt = false`
- All `portal-sender` source files remain byte-identical to the approved set.

## Diagnostic window now disabled
The diagnostic cases (`corrupt_signature`, `tamper_path`, `tamper_query`, `tamper_body_after_sign`, `replay_previous_batch`, `collide_batch_id`) are no longer reachable.

## Explicitly NOT done
- No `mode=apply`.
- No source modifications.
- No schema/RLS changes.
- No Portal user creation.
- No backfill.

## Next step
Authenticated administrator invokes individual diagnostic cases manually and reports results for audit before any apply mode is considered.
