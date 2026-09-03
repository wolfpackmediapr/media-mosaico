# CP5 Phase C3B — Controlled Digital Sender Deployment + One-Item Dry Run

Deploy the reviewed C3A.1 `portal-sender` source to the internal Publiteca project
(`qpozetnbnzdinqkrafze`) and perform exactly one Digital dry-run for the fixed
Metropistas pilot item. No apply. No second invocation.

## Blocking constraint to resolve first

The isolated Portal project is not reachable from this workspace. Every database
tool available here is bound to the internal project `qpozetnbnzdinqkrafze`; there
is no connection, service key, or read path to the Portal's Supabase project.

That means these C3B requirements cannot be executed from here:

- Portal pre-flight counts (`portal_sync_runs`, `portal_ingest_batches`,
  `portal_ingest_items`, `portal_ingest_item_mentions`, `content_items`,
  `content_client_mentions`, `content_media_sources`, `unresolved_client_matches`,
  `portal_projection_state`, `portal_projection_journal`)
- Proof that `digital / bd4d1c76-228b-4246-a544-cac2e3d44373` does not already exist
- Post-run Portal counts and zero-delta proof
- Direct inspection of staged mention-resolution rows and quarantine state

Two ways forward — pick one before deployment:

1. WolfPack runs the Portal pre-flight and post-run count queries on the Portal side
   and supplies both snapshots; this side deploys, invokes once, and reports the
   sender-observable evidence (HTTP status, full response, run_id, batch reference,
   `source_id_report`, per-item outcome, mentions in the transmitted DTO, finalize
   result).
2. Portal read credentials are provided to this workspace so the counts can be
   queried here directly.

Nothing is deployed or invoked until this is settled.

## Pre-deployment evidence (already collected, read-only)

Runtime bundle SHA-256 (current working tree = reviewed 72/72 C3A.1 state):

```text
index.ts            7df9aa4f0cb433e358280303cf1e5ea98722ba37f24dcb3c5c23a44c775d1bc6
handler.ts          863326086ba482f2ce41d7068a296d2295fcb8c8d822fd451430792a619f3020
auth.ts             b312731728afb65eb6f2508e63686298cc8e114a550b3a5d458da90429cda07c
signing.ts          93cb56aa76a569efcc9b44462b524dd6003bb8be9fb07a7c5645e77b64b9d4d8
finalize.ts         a43ef71aa65237ba0bd0f1a58f037bb998247f8ca61913d6f2e348b6c2b4a0d2
clients.ts          ff968cbb9a9de73158bb4b4d521fedca7aa7f8ba9391c85ccfe2e5843299c530
content/types.ts    af34b2197adf731e53b963575806fdf7ac287948d9c0c2866aba15c9e8ac477f
content/digital.ts  d9090c32e10e54b7ed27379d202973a54b9203f8b9cffb595d8132a122b25151
deno.json           4a6c1c4b96c387096016efe0d22052392a9135abcc01b59d4196f3c1913b2525
```

`supabase/functions/portal-sender/` contains no test files — all tests live in
`supabase/function-tests/portal-sender/` (including the golden pre-C3A handler
reference), so they are outside the deployed directory.

`supabase/config.toml` already pins `[functions.portal-sender] verify_jwt = false`,
matching the reviewed custom in-code authorization.

## Steps

1. Re-run the full portal-sender suite and `deno check` on the runtime bundle to
   re-confirm 72/72 green against these exact hashes; re-print the hashes after the
   run so the tested tree and the deployed tree are provably identical.
2. Read the current gate secrets and confirm `PORTAL_SENDER_ALLOW_APPLY=false` and
   `PORTAL_SENDER_TEST_MODE=false`. Abort if either differs. Neither is modified.
3. Portal pre-flight snapshot per the resolution above (WolfPack-supplied or queried
   here), including proof the pilot `digital / bd4d1c76-...` source key is absent.
4. Deploy only `portal-sender`, runtime files only, `verify_jwt=false`. Confirm ACTIVE
   status, gates still false, authorization code present, no test files in the bundle.
   No clients-sync smoke test.
5. Invoke exactly once with the fixed body:

```json
{
  "kind": "content",
  "media": "digital",
  "mode": "dry_run",
  "source_ids": ["bd4d1c76-228b-4246-a544-cac2e3d44373"],
  "limit": 1,
  "batch_size": 1
}
```

   On any error, timeout, or ambiguous result: STOP immediately, no retry, no cleanup.
6. Record the raw HTTP status and complete sender response: `run_key`/run_id, batch
   reference, `source_id_report`, item outcome (expected `would_apply`), the
   transmitted mention set, and the automatic finalize envelope (attempted, accepted,
   run status `completed`). No manual second finalize.
7. Post-run Portal counts and exact deltas; require zero delta on `content_items`,
   `content_client_mentions`, `content_media_sources`, `unresolved_client_matches`,
   `portal_projection_state`, `portal_projection_journal`.
8. Report expected-vs-actual on the mapped item: `source_type=digital`,
   `source_id=bd4d1c76-...`, title `Fitch mantiene la nota a deuda de Metropistas`,
   summary OMITTED, mentions PROMESA + Metropistas, source identities 2, canonical
   resolved 2, unresolved 0, Metropistas `08748447-a701-4be3-80c8-7470526e0975`, and
   PROMESA's canonical UUID as returned by the live resolver (not assumed). PROMESA is
   never dropped.
9. Confirm from deployment/source evidence only that the legacy clients route is still
   present with its unchanged pre-C3A response contract — the clients path is not invoked.

## Not touched

Database schema/data, RLS, Storage, cron jobs, other Edge Functions, Auth, Portal
receiver code, HMAC secrets/key IDs, and both gate secrets. No apply mode at any point.
