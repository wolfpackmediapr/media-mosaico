# CP3 Step 2 — Sender installed, verified, deployed; Phase A pending two user inputs

## Status: complete except Phase A invocation

### Checksum comparison — all MATCH (recomputed in place after writing)

| File | Bytes | SHA-256 |
|---|---|---|
| index.ts | 10848 ✓ | `015e7471…18f164` ✓ |
| signing.ts | 6510 ✓ | `93cb56aa…b9d4d8` ✓ |
| clients.ts | 2943 ✓ | `ff968cbb…99c530` ✓ |
| deno.json | 376 ✓ | `4a6c1c4b…3b2525` ✓ |

Files copied byte-for-byte from the uploaded sources into `supabase/functions/portal-sender/` — no edits, no reformatting.

### Configuration and deployment

- `[functions.portal-sender] verify_jwt = true` appended to `supabase/config.toml`.
- Secrets configured on the internal project: `PORTAL_INGEST_URL`, `PORTAL_INGEST_KEY_ID`, `PORTAL_SENDER_ALLOW_APPLY=false`, `PORTAL_SENDER_TEST_MODE=false`. No Portal service-role or DB credential stored. No secret values printed.
- Source invariants verified read-only: `_role: "administrator"`, service-role authorization path, apply triple gate, schema version 1, six diagnostics gated behind `PORTAL_SENDER_TEST_MODE`.
- `portal-sender` deployed to `qpozetnbnzdinqkrafze` — only this function. No schema, RLS, cron, or other-function changes.

## Phase A blocker — two inputs only you can provide

1. **`PORTAL_INGEST_SECRET`** — not yet in the secret store (the secure form was interrupted). Without it the sender cannot sign requests; I will not mint or substitute it.
2. **An administrator preview sign-in** — this project's Supabase is externally managed, so no session token can be minted in the sandbox; the dry-run call returned 401 with no auth header.

## Remaining step (on approval, after inputs arrive)

One invocation only:

```json
{ "mode": "dry_run", "run_key": "cp3-step2-connectivity-001", "limit": 5, "batch_size": 5 }
```

Then STOP and report: deployment status, verify_jwt status, checksum table, sender response, Portal response. No diagnostics, Phase B, replay, collision, apply, backfill, auth-user creation, or media sync.
