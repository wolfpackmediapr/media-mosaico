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
- Before sending, record `intendedBatchCount = batches.length`. Inside the loop track `acceptedBatchCount` (incremented only when the batch is genuinely accepted: HTTP `>= 200 && < 300` **and** a parsed JSON body exists **and** `body.ok === true`), plus `transportFailure` and `batchProtocolFailure`. A batch counts as a failure — setting `batchProtocolFailure` — on non-2xx status, 2xx with `{"ok":false}`, 2xx with malformed/non-JSON body, or 2xx with a missing/non-boolean `ok`; a fetch throw sets `transportFailure`. Each entry in `batches[]` keeps its status and parsed body or `parse_error` for debugging, with no credential material.
- Extract the handler body into an exported `handleRequest(request, deps?: HandlerDependencies)` with `deps = { fetchImpl?, finalizeImpl? }`. Production uses an explicit arrow wrapper `Deno.serve((request) => handleRequest(request));` — never `Deno.serve(handleRequest)` — so Deno's `ServeHandlerInfo` second argument can never be mistaken for injected dependencies.
- When `deps.fetchImpl` is supplied and `deps.finalizeImpl` is not, the default finalize helper is called with `fetchImpl: deps?.fetchImpl` so tests never make a real finalize network request.
- After the loop, finalize only when all four hold: `diagnostics_requested === false`, `transportFailure === false`, `batchProtocolFailure === false`, and `acceptedBatchCount === intendedBatchCount`. Otherwise:
  - diagnostics requested → `finalize: { attempted: false, reason: "diagnostics_active" }`
  - any other gate failure (batch protocol failure, transport failure, aborted/partial loop) → `finalize: { attempted: false, reason: "batch_failure" }`, and no finalize request is sent
- On a clean run (both `dry_run` and `apply`) call finalize exactly once:
  - HTTP 2xx **and** parsed `response.ok === true` → `finalize: { attempted: true, status, batch_id, response }`, HTTP 200 lifecycle success
  - anything else — non-2xx, 2xx with `{"ok":false}`, 2xx with malformed/non-JSON body, or a transport throw → HTTP 502 with `{ ok: false, code: "FINALIZE_FAILED", mode, run_key, batches: [...already-successful...], finalize: { attempted: true, status, batch_id, response|parse_error }, message: "Data batches were already accepted. Do not retry the full sender run." }`. Raw status/body context is preserved for debugging; no secret or key material is ever included. No data batch is resent; no automatic retry is implemented.

## Tests (`finalize_test.ts`)

Stubbed `fetchImpl`, deterministic values, covering all 23 required checks: finalize called exactly once on clean dry_run and apply; exact URL path; blank canonical query; body has exactly the four fields; header timestamp equals body `request_timestamp`; header batch id equals body `batch_id`; schema version `1` in header and body; the exact serialized bytes are what is hashed, signed and sent; zero finalize calls for diagnostics active, batch 401, 409, 500, transport exception, and intended-vs-sent batch count mismatch; finalize 200 with `ok:true` → lifecycle success; finalize 404/500, finalize 200 with `ok:false`, and finalize 200 with invalid/non-JSON body → `FINALIZE_FAILED` with no data resend; finalize transport exception → lifecycle failure with zero data-batch retries.

Regression: `auth_test.ts` (13 tests) and the signing test vector (`deno task vector`) rerun unchanged.

## Verification returned before any deployment

- Complete `finalize.ts`
- Exact `index.ts` diff
- SHA-256 hashes and byte counts for all runtime files
- Confirmation the unchanged files still match the approved hashes above
- Full `deno check` output for all runtime files (including proof that the production `Deno.serve((request) => handleRequest(request))` wrapper type-checks) and full test output
- Explicit statement that no deployment or sender invocation occurred

Then STOP for independent source review.
