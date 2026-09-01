# CP3 Step 2 — Install approved `portal-sender` + Phase A dry run

## Blocker: the four source files still have not been provided

I can only install the sender byte-for-byte if I receive the actual file contents. So far I have received hashes only. The expected values also changed between your two messages for `index.ts`:

| File | Message 1 | Message 2 |
|---|---|---|
| index.ts | `160dd40c…9eb10f` / 9154 bytes | `015e7471…18f164` / 10848 bytes |
| signing.ts | `93cb56aa…b9d4d8` / 6510 bytes | same |
| clients.ts | `ff968cbb…99c530` / 2943 bytes | same |
| deno.json | `4a6c1c4b…3b2525` / 376 bytes | same |

I will treat the **message-2** set as authoritative (`index.ts` = `015e7471…`, 10848 bytes) unless you say otherwise. Please paste the four files verbatim; then everything below runs without further questions.

## Pre-flight checks (already done, read-only)

| Check | Result |
|---|---|
| Connected Supabase ref | `qpozetnbnzdinqkrafze` — match |
| `supabase/functions/portal-sender` exists | No — clean install |
| `public.clients` has `id`, `name`, `is_active`, `updated_at` | Yes |
| `public.has_role(uuid, user_role)` | Exists — `(_user_id uuid, _role user_role)` |
| Admin enum value | `user_role` = `administrator` \| `data_entry` → exactly `administrator` |

## Steps once the source arrives

1. **Write the four files verbatim** to `supabase/functions/portal-sender/` — no reformatting, no lint fixes, no import rewrites.
2. **Checksum gate.** Run `sha256sum` plus `wc -c` on all four and print actual vs expected side by side. Any mismatch in hash or byte count → STOP, no deploy, report only.
3. **Read-only source property confirmation** (grep, no edits): `_role: "administrator"`, service-role automation authorization path, apply triple gate (`mode === "apply"` && `allow_apply === true` && `PORTAL_SENDER_ALLOW_APPLY === "true"`), schema version 1, the eight-line canonical request, and the six test-mode gates (`corrupt_signature`, `tamper_path`, `tamper_query`, `tamper_body_after_sign`, `replay_previous_batch`, `collide_batch_id`).
4. **Config.** Append to `supabase/config.toml` only:

```toml
[functions.portal-sender]
verify_jwt = true
```

5. **Secrets** on the internal project only: `PORTAL_INGEST_URL=https://publiteca-client-sync.lovable.app`, `PORTAL_INGEST_KEY_ID=portal-ingest-2026-09`, `PORTAL_SENDER_ALLOW_APPLY=false`, `PORTAL_SENDER_TEST_MODE=false`, and `PORTAL_INGEST_SECRET` requested through the secure secret form so you enter it directly — never printed, logged, or returned. No Portal service-role key, DB password, or PostgREST credential is stored here.
6. **Deploy only `portal-sender`** to `qpozetnbnzdinqkrafze`. No schema, migration, RLS, cron, or other-function changes. Verify status ACTIVE, `verify_jwt = true`, apply flag `false`, test mode `false`.
7. **Phase A, one invocation** with an administrator/service-role authorization path:

```json
{ "mode": "dry_run", "run_key": "cp3-step2-connectivity-001", "limit": 5, "batch_size": 5 }
```

   Expected: 5 clients read, 1 batch, schema v1, HMAC verified end-to-end, Portal HTTP 200, no Portal client projection.
8. **STOP.** No test mode, no negative/replay/collision/schema-v2 probes, no apply, no Portal users, no other content types, no backfill.

## Report returned

Project ref; four actual SHA-256 values and byte counts; MATCH/MISMATCH verdict; files installed; deployment version/status; `verify_jwt=true`; apply=false; test mode=false; exact Phase A request shape; clients read; batches sent; sender HTTP result; Portal HTTP status/code/body; confirmation no secret values were exposed.

Phase B is out of scope for this turn.
