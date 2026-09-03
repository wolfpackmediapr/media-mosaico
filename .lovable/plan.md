# CP5-C3C-PRE — One-Item Digital Apply: Production Runbook (planning only)

Nothing in this document has been executed. No secret was read or changed, no deployment, no invocation, no Portal contact.

## 1. How the apply gate is evaluated

- File/function: `supabase/functions/portal-sender/handler.ts`, inside `handleRequest`, using the local helper `env(name)` which wraps `Deno.env.get`.
- Exact condition:

```text
if (mode === "apply") {
  const envAllows = env("PORTAL_SENDER_ALLOW_APPLY") === "true";
  if (body.allow_apply !== true || !envAllows) -> 403
}
```

- Absent: `undefined !== "true"` → blocked.
- `"false"` (or any value other than the exact string `"true"`): blocked.
- `"true"`: allowed **only if** the request body also carries `allow_apply: true` and `mode: "apply"` (triple gate).
- Blocked response: HTTP **403**, body `{ ok: false, code: "APPLY_DISABLED", message: "Apply requires mode=apply, allow_apply=true and PORTAL_SENDER_ALLOW_APPLY=true" }`.
- Read timing: `Deno.env.get` is called **per invocation** inside the handler, not captured at module load. Note that Supabase secret changes still propagate by restarting the function's runtime, so the effective visibility is "next cold start after propagation".

Important: the payload in the C3C request as written (`mode: "apply"` without `allow_apply: true`) would be rejected with 403. The invocation body must include `"allow_apply": true`.

## 2. Is secret rotation required?

Yes. There is no code path that permits apply while `PORTAL_SENDER_ALLOW_APPLY` is not exactly `"true"`. One apply therefore requires setting the Edge Function secret to `true` and then back to `false`.

Operational effect:
- Changing a Supabase Edge Function secret does not re-deploy the function bundle, but it does invalidate the running isolates; the next invocation runs on a fresh isolate with the new environment.
- Visibility: typically within seconds, but not instantaneous or transactional.
- Rollback: set the same secret back to `false` (never delete it — absent also blocks, but `false` is the documented steady state).
- Verification after apply (WolfPack amendment 3): closure is evidenced by the successful control-plane secret update to `false` plus its timestamp and the absence of any subsequent sender invocation. **Do not** verify closure by issuing another `mode=apply` / `allow_apply=true` request — propagation is not instantaneous and such a probe could execute as a second real apply.


## 3. Exposure window analysis

While the secret is `true`, the sender accepts apply from **any** caller that `auth.ts` authorizes: a verified `service_role` JWT or **any** verified internal Publiteca user holding the `administrator` role. There is no per-actor allow-list for apply.

The sender has **no** restriction that scopes apply to a single source_id, a single actor, a single run, a single invocation, or a single media type. `source_ids`, `limit`, and `batch_size` are caller-supplied narrowing parameters, not server-side constraints; an admin could omit them and apply the full Digital corpus.

Therefore, for the duration the secret is `true`:

**GLOBAL APPLY WINDOW**

Risk assessment (per WolfPack amendment 4): the sender never writes to Publiteca's internal tables — it is source-only, read-only against `news_articles`. Classify the window as: internal DB mutation risk **negligible**; internal query/load risk **non-zero** (another administrator could launch a large Digital export, driving heavy reads); Portal pollution risk **real**; transport/API load risk **real**. Probability is low (few administrators, no UI surface calls this function), but operational risk is not zero. Keep the window as short as practical — minutes, not hours.

## 4. Options compared

**A. Temporarily enable, invoke once, immediately disable.**
- Pros: no code change, deployed bundle stays byte-identical to the reviewed and already-validated C3A.1 runtime; smallest review surface; fully reversible.
- Cons: opens a real GLOBAL APPLY WINDOW for the minutes it takes; relies on operator discipline and secret-propagation timing.

**B. Add a temporary single-use source-id gate in sender code.**
- Pros: narrows apply to exactly one source even if someone else invokes.
- Cons: requires modifying, re-testing, re-hashing and re-deploying the approved runtime, then a second change + deployment to remove it. Two extra production deployments and a divergence from the reviewed hashes — a larger risk to Publiteca than the window it removes. A "single-use" flag also needs durable state the sender does not have.

**C. Existing mechanisms.** `PORTAL_SENDER_TEST_MODE` is diagnostics-only and unrelated. `verify_jwt=false` plus custom `auth.ts` already limits callers to service_role/administrators. `run_key` and finalize gating limit lifecycle damage but not apply scope. No existing one-shot mechanism exists.

**Recommendation: Option A**, executed as a tightly time-boxed window (target under 5 minutes) with a pre-agreed operator, no other admin activity scheduled, and the disable step pre-staged so it can be applied immediately after the single invocation regardless of outcome. This keeps the deployed runtime identical to the reviewed C3A.1 bundle, which is the property with the highest value to production safety.

## 5. Deployed source verification

Current working-tree hashes (SHA-256), matching the approved C3A.1 set that was deployed in C3B:

```text
handler.ts          863326086ba482f2ce41d7068a296d2295fcb8c8d822fd451430792a619f3020
content/digital.ts  d9090c32e10e54b7ed27379d202973a54b9203f8b9cffb595d8132a122b25151
content/types.ts    af34b2197adf731e53b963575806fdf7ac287948d9c0c2866aba15c9e8ac477f
auth.ts             b312731728afb65eb6f2508e63686298cc8e114a550b3a5d458da90429cda07c
signing.ts          93cb56aa76a569efcc9b44462b524dd6003bb8be9fb07a7c5645e77b64b9d4d8
finalize.ts         a43ef71aa65237ba0bd0f1a58f037bb998247f8ca61913d6f2e348b6c2b4a0d2
clients.ts          ff968cbb9a9de73158bb4b4d521fedca7aa7f8ba9391c85ccfe2e5843299c530
index.ts            7df9aa4f0cb433e358280303cf1e5ea98722ba37f24dcb3c5c23a44c775d1bc6
```

`handler.ts`, `content/digital.ts` and `content/types.ts` match the hashes reported at C3A.1 sign-off verbatim. No source file has changed since the C3B deployment. The Supabase deployment API does not expose a per-file bundle digest for independent server-side comparison, so equality is established by "no edits since the deployed commit" rather than by remote attestation.

## 6. Expected Portal effect of one successful apply

From the sender DTO (one item, two resolved mentions, zero unresolved) the expected CP1 deltas are:

| Table | Expected delta |
|---|---|
| content_items | +1 |
| content_client_mentions | +2 |
| portal_projection_state | +1 |
| portal_projection_journal | +1 (or contract-defined) |
| unresolved_client_matches | +0 |
| content_media_sources | +0 |

Also expected on the Portal staging side: `portal_sync_runs` +1, `portal_ingest_batches` +1, `portal_ingest_items` +1, `portal_ingest_item_mentions` +2.

The exact journal row count per applied item, and whether `content_media_sources` is populated from `media_outlet`, are defined by the Portal receiver, not by this repository. **PORTAL-SIDE VERIFICATION REQUIRED** for both.

## 7. Replay / idempotency

Re-sending the identical item later with the same `source_id`, same `source_updated_at`, and same payload should be recognized by the Portal receiver as unchanged and recorded as `skipped_idempotent`, producing zero new `content_items`, zero new mentions, and no projection-state version bump (a new sync run/batch record is still expected, since each invocation is a distinct run).

The idempotency test is only meaningful in **apply** mode, so it requires a second, equally time-boxed apply window. The gate must **not** be left enabled between C3C and the idempotency test — close it after the first apply and reopen it deliberately for the replay.

## Proposed C3C runbook

Steps that change production state are marked **[STATE CHANGE]**.

**PRE-FLIGHT**
1. WolfPack supplies a fresh Portal read-only baseline for the six CP1 tables and the four staging tables, confirming source key `digital / bd4d1c76-…` is still absent.
2. Confirm deployed runtime hashes unchanged (section 5).
3. Re-run the portal-sender test suite (expect 72/72) and `deno check`.
4. Confirm `PORTAL_SENDER_TEST_MODE=false` and `PORTAL_SENDER_ALLOW_APPLY=false` by behavior: one `mode=apply, allow_apply=true` request must return 403 `APPLY_DISABLED`.
5. Confirm an authorized caller credential (service_role JWT or administrator JWT) is available in advance — C3B stopped precisely because none was present. Do not start the window without it.
6. Announce the window; no other administrator invokes portal-sender during it.

**ENABLE APPLY** — **[STATE CHANGE]**
7. Set `PORTAL_SENDER_ALLOW_APPLY=true`. Record wall-clock time. GLOBAL APPLY WINDOW opens.
8. Confirm propagation with a single harmless probe only if needed; otherwise proceed directly to step 9 to keep the window minimal.

**ONE INVOCATION** — **[STATE CHANGE]**
9. Invoke portal-sender exactly once with:

```json
{
  "kind": "content",
  "media": "digital",
  "mode": "apply",
  "allow_apply": true,
  "source_ids": ["bd4d1c76-228b-4246-a544-cac2e3d44373"],
  "limit": 1,
  "batch_size": 1
}
```

10. Capture the complete response verbatim: `ok`, `run_key`, `total_items`, `batch_count`, `source_id_report`, per-batch status/response, and the `finalize` envelope.

**IMMEDIATE DISABLE** — **[STATE CHANGE]**
11. Regardless of outcome — success, failure, timeout, or ambiguity — set `PORTAL_SENDER_ALLOW_APPLY=false` immediately. Record wall-clock time; report the total window duration.
12. Verify closed: one `mode=apply, allow_apply=true` request returns 403 `APPLY_DISABLED`.

**PORTAL POST-FLIGHT** (WolfPack, read-only)
13. Re-count the six CP1 tables and four staging tables; compare against the pre-flight baseline and the expected deltas in section 6.
14. Confirm the two mentions resolved to the canonical PROMESA and Metropistas UUIDs, unresolved 0, quarantined 0.
15. Confirm the run row for the emitted `run_key` shows status completed with `items_failed = 0`.

**FAILURE / TIMEOUT HANDLING**
16. **Do not retry.** A timeout or ambiguous response means the batch may already have been accepted Portal-side.
17. `BATCH_DELIVERY_FAILED` (502): batches partially accepted, no finalize attempted — close the gate, then have WolfPack inspect staging and decide on manual finalize or cleanup out-of-band.
18. `RUN_FINALIZED_FAILED` / `FINALIZE_PROTOCOL_ERROR` / `FINALIZE_FAILED` (502): data batches were accepted; the run's terminal state is unresolved. Close the gate and escalate to Portal-side inspection.
19. `403 APPLY_DISABLED`: secret had not propagated. Nothing was sent. This is safe to re-attempt once, still inside the same window.
20. `401`: credential problem, nothing sent, no Portal state — close the gate and reschedule.

**ROLLBACK**
21. Gate rollback is step 11 (`false`), verified by step 12.
22. Data rollback is Portal-side only. media-mosaico has no ability to unwrite Portal rows and must not be given Portal credentials. Any cleanup of `content_items` / `content_client_mentions` / projection rows for the pilot source key is performed by WolfPack in the isolated Portal project.
23. No rollback of media-mosaico state is ever needed: the sender only reads `news_articles`.

**IDEMPOTENCY TEST PLAN** (separate, later phase — C3D)
24. Fresh Portal baseline after C3C settles.
25. Reopen the gate for a second time-boxed window — **[STATE CHANGE]**.
26. Invoke exactly once with the identical payload (new `run_key` generated automatically); do not modify the source article in between, so `source_updated_at` is unchanged.
27. Close the gate immediately — **[STATE CHANGE]** — and verify 403.
28. Expected Portal result: item disposition `skipped_idempotent`, `content_items` +0, `content_client_mentions` +0, projection version unchanged; a new sync run and batch record are still created.

STOP — planning only.
