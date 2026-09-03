# CP5-C4A.3D1 — Shadow Canary (execution plan)

Observational only. Legacy stays the sole authoritative writer. No source changes, no redeploy, no manual invocation, no DB/schema/RLS/cron changes.

## Confirmed from approved source (read-only, this turn)

- Configuration key: `DIGITAL_CLIENT_MATCHER_MODE`, read via `Deno.env.get` in `process-rss-feed/index.ts` (line 460). Value required to activate shadow: exactly `shadow`.
- Gating: `parseMatcherMode` fails closed to `legacy` for missing/invalid; `loadShadowContext` only builds the roster/policy index when shadow is active; `newMatcherIsAuthoritative()` returns `false` unconditionally.
- Shadow runs only AFTER the authoritative insert, inside a local `try/catch` that swallows errors to `console.error`. Zero extra AI calls (reuses `analysis.__rawAiClients`).
- Current UTC 15:51, HEAD `7323b0dc` (plan-file commits only; `f8e3dc6e` is an ancestor, runtime source unchanged). Rollback source remains `7f064bb2` / `9c705088…62ff2`.

## Known blocker to flag before activation

D0 established that edge-function logs for `process-rss-feed` are not retrievable through the log/analytics interfaces, and the cron `pg_net` call times out client-side at ~5s (pre-existing). Shadow diagnostics are emitted **only** as `console.log` lines. If log retrieval is still unavailable, the canary can be activated safely but Step 4 (matcher comparison) will produce no data.

Therefore the first action is a log-retrievability probe. If logs are still unreadable, the plan stops before activation and reports `C4A.3D1 HOLD — MORE SHADOW DATA REQUIRED` rather than enabling a configuration whose output cannot be observed.

## Steps

1. **Pre-canary verification (read-only):** UTC timestamp, re-hash the five approved C4A.3 files plus the eight portal-sender files (any drift = STOP), confirm `DIGITAL_CLIENT_MATCHER_MODE` absent, confirm cron job 1 `*/30 * * * *` health for the last runs, and probe whether `process-rss-feed` logs are retrievable at all.
2. **Activate shadow:** single configuration mutation — set secret `DIGITAL_CLIENT_MATCHER_MODE=shadow`. Nothing else. Record previous value (absent) and new value. No source edit, no redeploy requested by us (the platform may restart function runtimes to pick up the secret; that is not a code deployment).
   - Note: the secret is project-wide. The currently deployed `reanalyze-articles` bundle predates C4A.3 and therefore contains no shadow code, so the flag is inert for it. This will be re-confirmed before setting.
3. **Observe 3 natural cron runs** (~16:00, 16:30, 17:00 UTC, subject to actual schedule). No manual invocation. Per run: timestamp, result, articles processed/inserted/skipped, runtime errors, shadow diagnostic count, shadow error count, AI calls. Insert-path health is corroborated read-only via hourly `news_articles` counts if function logs stay unavailable.
4. **Aggregate comparison** from `digital_client_matcher_shadow` log lines: articles evaluated, legacy vs shadow match counts, exact agreements, legacy-only, shadow-only, differing sets, disagreement rate, invalid-UUID drops, rejection reasons, shadow exceptions. Representative disagreements limited to id/title/old/proposed/evidence.
5. **Safety verification and rollback rule:** confirm no authoritative change, no ingestion regression, no DB/schema/RLS/cron/unrelated-function change. On any stop condition, the only rollback is deleting the `DIGITAL_CLIENT_MATCHER_MODE` secret to restore the verified D0 state; the deployed C4A.3 code is not rolled back absent evidence it caused a regression.
6. **Final report** in the requested format, ending with exactly one verdict.

## Timing

The canary spans ~90 minutes of natural cron traffic, so the final report arrives after the third observed run; interim status will be reported as runs complete.
