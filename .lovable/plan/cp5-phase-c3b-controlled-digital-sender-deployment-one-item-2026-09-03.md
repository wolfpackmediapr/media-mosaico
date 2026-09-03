# CP5 Phase C3B — Controlled Digital Sender Deployment + One-Item Dry Run

Deploy the reviewed C3A.1 `portal-sender` source to the internal Publiteca project
(`qpozetnbnzdinqkrafze`) and perform exactly one Digital dry-run for the fixed
Metropistas pilot item. No apply. No second invocation. No Portal-side database
verification from this workspace.

## Boundary decision — Option 1 approved

The isolated Portal project stays isolated: no Portal database or service-role
credentials are requested or added here. WolfPack owns all Portal-side evidence.

WolfPack-supplied pre-flight baseline (CP5-C3B-PRE, read-only, PASS):

```text
portal_sync_runs             7
portal_ingest_batches        7
portal_ingest_items         50
portal_ingest_item_mentions  0
content_items                0
content_client_mentions      0
content_media_sources        0
unresolved_client_matches    0
portal_projection_state     28
portal_projection_journal   28
```

Pilot source key `digital / bd4d1c76-228b-4246-a544-cac2e3d44373` confirmed absent
everywhere checked. Portal is clean for the first Digital dry-run.

This workspace performs no Portal queries and reports only sender-observable evidence.

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
   re-confirm 72/72 green; re-print the hashes after the run so the tested tree and
   the deployed tree are provably identical.
2. Read the gate secrets and confirm `PORTAL_SENDER_ALLOW_APPLY=false` and
   `PORTAL_SENDER_TEST_MODE=false`. Abort if either differs. Neither is modified.
3. Deploy only `portal-sender`, runtime files only, `verify_jwt=false`. Confirm ACTIVE
   status, gates still false, in-code authorization present, no test files in the
   bundle. No clients-sync smoke test.
4. Invoke exactly once with the fixed body:

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

   On any error, timeout, or ambiguous result: STOP immediately — no retry, no apply,
   no cleanup.
5. Record and report the sender-observable evidence only:
   - invocation HTTP status and the complete sender response body
   - run_key / run id, batch reference, item id if present
   - `source_id_report`
   - mapped item: `source_type`, `source_id`, title, summary omission
   - transmitted mention set with canonical UUIDs (PROMESA + Metropistas; PROMESA's
     UUID as returned, not assumed; Metropistas expected
     `08748447-a701-4be3-80c8-7470526e0975`); source identities 2, resolved 2,
     unresolved 0. PROMESA is never dropped.
   - automatic finalize envelope: attempted, accepted, run status `completed`. No
     manual finalize call.
   - gate state after the run; explicit confirmation of exactly one invocation
6. Confirm from deployment/source evidence only that the legacy clients route remains
   present with its unchanged pre-C3A response contract — the clients path is not invoked.
7. STOP and hand off to WolfPack for the Portal-side post-flight inspection and delta
   proof against the baseline above.

## Not touched

Database schema/data, RLS, Storage, cron jobs, other Edge Functions, Auth, Portal
receiver code, Portal data, HMAC secrets/key IDs, and both gate secrets. No apply mode
at any point.
