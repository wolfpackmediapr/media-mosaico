# CP3 Step 2 — Internal `portal-sender` deployment + Phase A dry run

## Pre-flight checks (already run, read-only)

| Check | Result |
|---|---|
| Connected Supabase project ref | `qpozetnbnzdinqkrafze` — matches |
| `supabase/functions/portal-sender` exists | No — clean install |
| `public.clients` has `id`, `name`, `is_active`, `updated_at` | Yes (all four present) |
| `public.has_role(uuid, user_role)` exists | Yes — signature `(_user_id uuid, _role user_role)` |
| Admin enum value | `user_role` = `administrator` \| `data_entry`; exact value is `administrator` |

Note: the enum type is `user_role` (not `app_role`), matching the prompt.

## What gets built

New function `supabase/functions/portal-sender/` with exactly four files:

- `index.ts` — HTTP entry. Validates caller JWT, requires `has_role(auth.uid(), 'administrator')`, parses/validates body with a strict schema (`mode` in `dry_run|apply`, `run_key`, `limit`, `batch_size`), reads clients, batches, signs, posts to the Portal, returns a per-batch report.
- `clients.ts` — reads `public.clients` via the **internal** `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, projecting only `id`, `name`, `is_active`, `updated_at`; deterministic ordering (`created_at, id`) so `limit` is stable.
- `signing.ts` — HMAC-SHA256 over the approved eight-line canonical request:

```text
METHOD
PATH
CANONICAL_QUERY
SCHEMA_VERSION
KEY_ID
TIMESTAMP
BATCH_ID
SHA256_HEX(raw_body)
```

  Emits key id, timestamp, batch id and signature headers alongside the raw body that was hashed (byte-identical body is sent).
- `deno.json` — pinned imports only.

Guardrails inside the function:
- `mode: "apply"` is rejected with 403 unless `PORTAL_SENDER_ALLOW_APPLY === "true"`.
- `PORTAL_SENDER_TEST_MODE` read but stays `false`.
- Schema version `1` in payload and canonical string.
- Secrets are never logged or echoed in responses.

`supabase/config.toml` gains:

```toml
[functions.portal-sender]
verify_jwt = true
```

No database migration, no RLS change, no other function touched, nothing deployed to the Portal project.

## Secrets

Set on the internal project only:

- `PORTAL_INGEST_URL=https://publiteca-client-sync.lovable.app`
- `PORTAL_INGEST_KEY_ID=portal-ingest-2026-09`
- `PORTAL_SENDER_ALLOW_APPLY=false`
- `PORTAL_SENDER_TEST_MODE=false`
- `PORTAL_INGEST_SECRET` — **requested via the secure secret form**, so you paste it directly; it is never printed, logged, or returned. It must match the value already configured on the Portal.

No Portal service-role key, DB password, or PostgREST credential is stored here.

## Phase A — dry run only

After deploy, verify status ACTIVE, `verify_jwt = true`, `PORTAL_SENDER_ALLOW_APPLY` still `false`, then invoke once as an administrator:

```json
{ "mode": "dry_run", "run_key": "cp3-step2-connectivity-001", "limit": 5, "batch_size": 5 }
```

Expected: sender 200, Portal 200, schema version 1 accepted, HMAC verified end-to-end, 5 clients read, 1 batch sent, zero `portal_clients` projection rows.

Then STOP. No test mode, no negative tests, no apply, no Portal users, no other content types, no backfill.

## Report returned to you

Project ref, exact files deployed, function version/status, `verify_jwt=true`, `apply=false`, Phase A request shape, sender response, Portal HTTP status/code/body, clients read, batches sent. No secret values.

## Open question

The "approved sender source" was not included in this message, so I will author the three TypeScript files to the spec above (eight-line canonical string, `administrator` role check, schema version 1). If you have exact approved source text, paste it and I will install it verbatim instead.
