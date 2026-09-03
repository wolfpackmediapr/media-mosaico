# CP5-C3C — First One-Item Digital Apply (Execution Runbook)

Authorized scope: exactly one apply-capable invocation of `portal-sender` for
`digital / bd4d1c76-228b-4246-a544-cac2e3d44373`. Nothing else.

## Authentication — Option B (final amendment)

The single production invocation is executed by WolfPack locally using the
already-proven internal Publiteca administrator JWT workflow from C3B.

Lovable must NOT:

- add service-role credentials to this workspace
- store an administrator JWT
- depend on unverified Lovable-preview session forwarding

Division of labor: Lovable performs the read-only pre-flight, opens the gate
(`PORTAL_SENDER_ALLOW_APPLY=true`), reports "gate open — ready for invocation",
and STOPs. WolfPack performs the one invocation. On WolfPack's go-ahead (or if
combined into one continuous operation), Lovable immediately closes the gate
and reports closure. Lovable never issues a sender request.

## Gate state wording (encrypted secrets are not directly readable)

Because secret values cannot be read directly, pre-flight does NOT claim direct
observation of `PORTAL_SENDER_ALLOW_APPLY=false`. It reports instead:

- no known secret mutation since the documented false steady state
- no pre-flight sender probe performed

The sequence explicitly sets `true → one invocation → false`.

## Steps (state-changing steps marked)

1. PRE-FLIGHT — read-only
   - Re-verify reviewed C3A.1 runtime hashes for `handler.ts`, `content/digital.ts`,
     `content/types.ts`, `finalize.ts`, `signing.ts`, `auth.ts`, `clients.ts`, `index.ts`.
   - Re-run the portal-sender test suite (expect 72/72) and `deno check`.
   - Confirm deployment unchanged, `verify_jwt=false`.
   - Gate wording per amendment: report no known secret mutation since the
     documented false steady state (no direct secret-value observation), and no
     pre-flight sender probe performed.
   - Confirm WolfPack has the authorized administrator JWT ready and that no other
     administrator will invoke `portal-sender` during the window.
   - No deployment, no code change, no internal DB change, no probe.

2. OPEN APPLY WINDOW — **STATE CHANGE (Lovable)**
   - Set `PORTAL_SENDER_ALLOW_APPLY=true` via the secret control plane.
   - Record the control-plane success timestamp (UTC).
   - Wait the 60-second propagation interval. No probe of any kind.
   - Report "gate open — ready for invocation" and STOP.

3. EXACTLY ONE INVOCATION — **STATE CHANGE (WolfPack, Portal ingestion)**
   - WolfPack POSTs once to `portal-sender` with the authorized administrator
     Authorization header and exactly the approved payload:
     `{"kind":"content","media":"digital","mode":"apply","allow_apply":true,
       "source_ids":["bd4d1c76-228b-4246-a544-cac2e3d44373"],"limit":1,"batch_size":1}`
   - WolfPack captures the full non-secret response. No second request under any outcome.

4. IMMEDIATELY CLOSE APPLY WINDOW — **STATE CHANGE (Lovable)**
   - Regardless of outcome (success, 401/403/4xx/5xx, timeout, ambiguous), set
     `PORTAL_SENDER_ALLOW_APPLY=false` immediately upon WolfPack's go-ahead.
   - Record the control-plane success timestamp and total window duration.
   - No closure-verification request and no post-disable sender request of any kind.
     Control-plane success + timestamp + no further invocation is the closure evidence.

5. NO-RETRY RULE
   - `403 APPLY_DISABLED`, timeout, or ambiguous transport/finalize result → close the
     gate and STOP. No retry, because the Portal may already hold accepted staging.

6. REPORT AND STOP
   - Report: gate-enable timestamp, invocation timestamp, HTTP status, complete
     non-secret response, `run_key`, Portal `run_id`, `batch_ref`, `source_id_report`,
     item outcome, mention counts, finalize outcome/status, gate-disable timestamp,
     total apply-window duration, and confirmation of exactly one invocation.
   - Final state report wording: no internal Publiteca DB changes; no
     schema/RLS/Auth/Storage/cron changes; no deployment/code changes; only the
     explicitly authorized Portal projection may have changed Portal data.

## Explicitly out of scope

C3D idempotency replay, clients sync, any other content item, cleanup, manual
finalize, Portal reads or modifications from this workspace.
