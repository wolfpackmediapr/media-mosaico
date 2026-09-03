# CP5-C4A.3D1-RETRY — Shadow Canary (with Bounded Canary Closure Addendum)

Continuation of the already-authorized D1-RETRY canary. Not a restart. No extra cron run, no source change, no redeploy, no manual invocation, no DB/schema/RLS/cron change. Legacy remains the sole authoritative writer; shadow is observational only.

## Verified pre-canary configuration

- `DIGITAL_CLIENT_MATCHER_MODE` = absent
- effective mode = legacy
- Therefore rollback action = DELETE the secret (not set to `legacy`)

## Observability constraint (unchanged)

`process-rss-feed` diagnostics are retrievable only from `function_logs` within an approximately one-hour rolling window. After each of the three natural cron runs, harvest promptly (target within ~15 minutes) using:

```sql
select timestamp, event_message
from logs
where source = 'function_logs'
  and log_attributes['function_id'] = 'd8679615-30c4-491f-ab17-d888aa8ca7ed'
  and timestamp > now() - interval 1 hour
order by timestamp desc
limit 400
```

Extract and persist every `digital_client_matcher_shadow` line into the report as it is collected.

## Steps

1. Continue the canary as already underway. Observe Natural Cron Runs 1, 2, 3 only. Harvest and preserve evidence promptly after each run.
2. **Mandatory closure (addendum).** Immediately after the Run 3 evidence is preserved — regardless of whether the eventual verdict is PASS, HOLD, or FAIL — delete `DIGITAL_CLIENT_MATCHER_MODE`. Record:
   - disable/delete request UTC
   - control-plane success UTC
   - configuration after canary = absent
3. Prohibited at closure: setting the value to `legacy`, redeploying, manually invoking `process-rss-feed`, issuing any probe invocation after deletion, deliberately observing a fourth shadow run, or extending the canary automatically.
4. Aggregate the three runs: articles evaluated, legacy vs shadow match counts, agreements, legacy-only, shadow-only, disagreement rate, invalid-UUID drops, rejection reasons, shadow exceptions, AI-call count (expected: zero additional).
5. Safety verification: no authoritative change, no ingestion regression, no DB/schema/RLS/cron/unrelated-function change, no source drift.

## Final report additions

The final report must include, in addition to the previously required sections:

```text
CANARY CLOSURE

configuration before canary:   (required: absent)
configuration during canary:   (required: shadow)
configuration after canary:    (required: absent)
disable/delete request UTC:
disable/delete success UTC:
fourth/manual invocation:      (required: NO)
```

Ends with exactly one verdict:

- C4A.3D1-RETRY PASS — READY FOR NEXT CONTROLLED SHADOW EXPANSION
- C4A.3D1-RETRY HOLD — MORE SHADOW DATA REQUIRED
- C4A.3D1-RETRY FAIL — RETURNED TO LEGACY SAFE STATE

Then stop and await explicit authorization. Do not proceed beyond D1-RETRY and do not make the new matcher authoritative.
