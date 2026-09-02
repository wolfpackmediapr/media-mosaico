# CP3 Phase F — Automatic Run Finalization (source only)

Add automatic lifecycle finalization to the internal `portal-sender`. No deployment, no sender invocation, no Portal source or database changes, no retroactive finalization of the six historical runs.

## Files

Add:
- `supabase/functions/portal-sender/finalize.ts`
- `supabase/functions/portal-sender/finalize_test.ts` (test-only)

Modify:
- `supabase/functions/portal-sender/index.ts`

Unchanged (byte-identical, hashes re-verified after the pass):
- `auth.ts` `b312731728afb65eb6f2508e63686298cc8e114a550b3a5d458da90429cda07c`
- `signing.ts` `93cb56aa76a569efcc9b44462b524dd6003bb8be9fb07a7c5645e77b64b9d4d8`
- `clients.ts` `ff968cbb9a9de73158bb4b4d521fedca7aa7f8ba9391c85ccfe2e5843299c530`
- `deno.json` `4a6c1c4b96c387096016efe0d22052392a9135abcc01b59d4196f3c1913b2525`
- `auth_test.ts` `f1dd103ec806b3f8a1baacef86395aa523ef6583234c40de443b0bedee53be75`

## finalize.ts

`finalizePortalRun({ portalBaseUrl, runKey, keyId, secret, fetchImpl? })`

1. Fresh ISO timestamp (`new Date().toISOString()`).
2. Deterministic bounded finalize batch id: `finalize:<first 32 hex chars of sha256Hex(runKey)>` — fixed 41 characters, always under the Portal 200-char limit. Uses the existing `sha256Hex` from `signing.ts`; no new hashing code.
3. Serialize the body exactly once, keys in this order and no others: `schema_version` (1), `run_key`, `batch_id`, `request_timestamp`.
4. Sign those exact bytes with the approved `signRequest()` from `signing.ts`, path `/api/public/ingest/finalize`. No HMAC logic is duplicated.
5. POST the identical bytes with the five `x-portal-*` headers produced by `signRequest`.
6. Return `{ status, response, batch_id }`; a transport throw surfaces as a thrown error the caller converts into a lifecycle failure.

`fetchImpl` defaults to global `fetch` and exists only as an in-process test seam; production calls the helper without it.

## index.ts changes

- Import `finalizePortalRun`.
- Track, inside the batch loop, whether every intended batch completed with `status >= 200 && status < 300` and whether any transport error occurred (existing `catch` path already records an `error` entry; it now also flips a failure flag).
- Extract the handler body into an exported `handleRequest(request, deps?)` with `deps = { fetchImpl?, finalizeImpl? }`, and keep `Deno.serve(handleRequest)` calling it with no deps. This is required so the finalize-gating tests can stub batch responses in-process; behavior with no deps is unchanged.
- After the loop:
  - diagnostics requested → `finalize: { attempted: false, reason: "diagnostics_active" }`
  - any non-2xx or transport failure or aborted run → `finalize: { attempted: false, reason: "batch_failure" }`
  - otherwise (both `dry_run` and `apply`) call finalize exactly once:
    - 2xx → `finalize: { attempted: true, status, batch_id, response }`, HTTP 200 lifecycle success
    - non-2xx or throw → HTTP 502 with `ok: false`, `code: "FINALIZE_FAILED"`, the already-successful `batches[]`, the failed finalize report, and an explicit `message` telling the caller not to retry the full sender run (deterministic ingest batch ids plus fresh timestamps would collide). No data batch is resent; no automatic retry is implemented.

## Tests (`finalize_test.ts`)

Stubbed `fetchImpl`, deterministic values, covering all 20 required checks: finalize called exactly once on clean dry_run and apply; exact URL path; blank canonical query; body has exactly the four fields; header timestamp equals body `request_timestamp`; header batch id equals body `batch_id`; schema version `1` in header and body; the exact serialized bytes are what is hashed, signed and sent; zero finalize calls for diagnostics active, batch 401, 409, 500, and transport exception; finalize 200 → lifecycle success; finalize 404/500 → lifecycle failure with no data resend; finalize transport exception → lifecycle failure with zero data-batch retries.

Regression: `auth_test.ts` (13 tests) and the signing test vector (`deno task vector`) rerun unchanged.

## Verification returned before any deployment

- Complete `finalize.ts`
- Exact `index.ts` diff
- SHA-256 hashes and byte counts for all runtime files
- Confirmation the unchanged files still match the approved hashes above
- Full `deno check` output for all runtime files and full test output
- Explicit statement that no deployment or sender invocation occurred

Then STOP for independent source review.
