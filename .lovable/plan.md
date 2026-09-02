# CP3 Phase F — Final Source Correction: Finalized Run Status Validation

Source only. No deployment, no sender invocation, no secret or database changes.

## Problem

The sender currently treats a finalize endpoint acceptance (HTTP 2xx + `ok:true`) as full run success. The Portal contract returns 200/`ok:true` even when the finalized run ends as `report.run.status = "failed"` (set when `items_failed > 0`). The sender must distinguish transport acceptance from lifecycle outcome.

## Changes

### 1. `finalize.ts` — add run-status classification

Keep `isFinalizeAccepted()` unchanged as the low-level endpoint check. Add, in the same module:

- `type FinalizedRunStatus = "completed" | "failed"`
- `classifyFinalizedRun(result: FinalizeResult): { outcome: "completed" | "failed" | "protocol_error" }` — reads `result.response.report.run.status` with strict typing:
  - `"completed"` → `completed`
  - `"failed"` → `failed`
  - missing `report`, missing `report.run`, missing/non-string `status`, or any other value → `protocol_error`

No signing, URL, header, or body change.

### 2. `handler.ts` — three terminal finalize branches

Replace the current single success branch. After `finalizePortalRun` returns and `isFinalizeAccepted(result)` is true, classify:

| Case | HTTP | Body |
|---|---|---|
| `run.status === "completed"` | 200 | `ok: true`, existing `finalize` object |
| `run.status === "failed"` | 502 | `ok: false`, `code: "RUN_FINALIZED_FAILED"`, `finalize: { attempted, status, batch_id, response }`, message `"The Portal finalized this sync run with status=failed. Do not retry the full sender run automatically."` |
| missing/unknown status | 502 | `ok: false`, `code: "FINALIZE_PROTOCOL_ERROR"`, same `finalize` object, message stating no automatic retry |

The existing `FINALIZE_FAILED` branch (non-2xx, `ok:false`, malformed JSON, transport throw) is unchanged. No branch resends an ingest batch. Every other handler behavior — authorize, admin/service_role routing, apply triple gate, client fetch/order/mapping, run_key, batch IDs, serialization/signing, diagnostics, replay, collide, dry_run/apply, `test_vector_ok`, `no_batches`, `BATCH_DELIVERY_FAILED` — stays byte-equivalent.

### 3. `finalize_test.ts` — contract fixture + new tests

- Replace the default finalize fixture `{ok:true, report:{items_failed:0}}` with the real contract shape `{ok:true, report:{run:{status:"completed"}}}` (harness default, so all existing clean-run tests exercise the real shape).
- New tests:
  - `finalize 200 ok true and run completed is sender success` → 200, `ok:true`
  - `finalize 200 ok true with run failed is RUN_FINALIZED_FAILED` → 502, code, `batchCalls.length === 2` (zero resend), one finalize call
  - `finalize 200 ok true with missing run status is FINALIZE_PROTOCOL_ERROR` → 502, zero resend
  - `finalize 200 ok true with unknown run status is FINALIZE_PROTOCOL_ERROR` → 502
- Harden `finalize request URL, query, body and headers are exact`: assert `x-portal-key-id === "cp3-test-key"` and assert the exact set of `x-portal-*` headers present is exactly `key-id`, `timestamp`, `batch-id`, `schema-version`, `signature`.

## Verification

Run and report literal output for `deno check` (six source files), `deno test`, and `deno task vector`; expected 38 tests passing and the vector signature unchanged at `dc3a190f…`. Return the changed source, the exact diff, and new SHA-256 hashes plus byte counts for `finalize.ts`, `handler.ts`, `finalize_test.ts` (others unchanged). Then stop for final approval before deployment.
