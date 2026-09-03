# CP5-C3C — First One-Item Digital Apply (Execution Runbook)

Authorized scope: exactly one apply-capable invocation of `portal-sender` for
`digital / bd4d1c76-228b-4246-a544-cac2e3d44373`. Nothing else.

## Blocking prerequisite (unchanged from C3B)

The backend is an external, unmanaged Supabase project. This workspace holds no
service-role key and no administrator JWT, and no session can be minted here
(auth status: `external_unmanaged`). The C3B attempt failed at the authorization
boundary with `401 MISSING_AUTHORIZATION` for exactly this reason.

`portal-sender` accepts only a verified `service_role` JWT or a verified internal
Publiteca administrator. Therefore, before the window opens, one of these must be true:

- Option A (preferred, no secrets shared): an administrator signs in to the Lovable
  preview of this app. The edge-function call tool then attaches that live
  administrator session token automatically, and no credential is ever pasted,
  logged, or stored.
- Option B: the administrator runs the single invocation themselves from their own
  authenticated environment and returns the response for reporting.

If neither is in place, the gate is never opened and no invocation is made.

## Steps (state-changing steps marked)

1. PRE-FLIGHT — read-only
   - Re-verify reviewed C3A.1 runtime hashes for `handler.ts`, `content/digital.ts`,
     `content/types.ts`, `finalize.ts`, `signing.ts`, `auth.ts`, `clients.ts`, `index.ts`.
   - Re-run the portal-sender test suite (expect 72/72) and `deno check`.
   - Confirm deployment unchanged, `verify_jwt=false`, `PORTAL_SENDER_TEST_MODE=false`,
     `PORTAL_SENDER_ALLOW_APPLY=false`.
   - Confirm the authorized administrator session is present and that no other
     administrator will invoke `portal-sender` during the window.
   - No deployment, no code change, no DB change, no probe.

2. OPEN APPLY WINDOW — **STATE CHANGE**
   - Set `PORTAL_SENDER_ALLOW_APPLY=true` via the secret control plane.
   - Record the control-plane success timestamp (UTC).
   - Wait the predetermined short propagation interval (60 s). No probe of any kind.

3. EXACTLY ONE INVOCATION — **STATE CHANGE (Portal ingestion)**
   - POST once to `portal-sender` with the authorized administrator Authorization
     header and exactly the approved payload:
     `{"kind":"content","media":"digital","mode":"apply","allow_apply":true,
       "source_ids":["bd4d1c76-228b-4246-a544-cac2e3d44373"],"limit":1,"batch_size":1}`
   - Capture the full non-secret response. No second request under any outcome.

4. IMMEDIATELY CLOSE APPLY WINDOW — **STATE CHANGE**
   - Regardless of outcome (success, 401/403/4xx/5xx, timeout, ambiguous), set
     `PORTAL_SENDER_ALLOW_APPLY=false` immediately.
   - Record the control-plane success timestamp and total window duration.
   - No closure-verification request. Control-plane success + timestamp + no further
     invocation is the closure evidence.

5. NO-RETRY RULE
   - `403 APPLY_DISABLED`, timeout, or ambiguous transport/finalize result → close the
     gate and STOP. No retry, because the Portal may already hold accepted staging.

6. REPORT AND STOP
   - Report: gate-enable timestamp, invocation timestamp, HTTP status, complete
     non-secret response, `run_key`, Portal `run_id`, `batch_ref`, `source_id_report`,
     item outcome, mention counts, finalize outcome/status, gate-disable timestamp,
     total apply-window duration, confirmation of exactly one invocation, and
     confirmation of no deployment/code/DB changes.

## Explicitly out of scope

C3D idempotency replay, clients sync, any other content item, cleanup, manual
finalize, Portal reads or modifications from this workspace.
