# CP5-C4A.3D1 — Shadow Canary (execution plan)

Observational only. Legacy stays the sole authoritative writer. No source changes, no redeploy, no manual invocation, no DB/schema/RLS/cron changes.

## Confirmed from approved source (read-only, this turn)

- Configuration key: `DIGITAL_CLIENT_MATCHER_MODE`, read via `Deno.env.get` in `process-rss-feed/index.ts` (line 460). Value required to activate shadow: exactly `shadow`.
- Gating: `parseMatcherMode` fails closed to `legacy` for missing/invalid; `loadShadowContext` only builds the roster/policy index when shadow is active; `newMatcherIsAuthoritative()` returns `false` unconditionally.
- Shadow runs only AFTER the authoritative insert, inside a local `try/catch` that swallows errors to `console.error`. Zero extra AI calls (reuses `analysis.__rawAiClients`).
- Current UTC 15:51, HEAD `7323b0dc` (plan-file commits only; `f8e3dc6e` is an ancestor, runtime source unchanged). Rollback source remains `7f064bb2` / `9c705088…62ff2`.

## Observability precondition (current-state check, not a known blocker)

D0 ended with `process-rss-feed` logs visible for the 15:30:36–15:30:37Z natural run and no error matches. Shadow diagnostics are emitted only as `console.log` lines, so log retrievability is verified as a current state at Step 1. If logs are retrievable, proceed normally; if they have become unavailable again, STOP before activating shadow and return `C4A.3D1 HOLD — MORE SHADOW DATA REQUIRED`.

## Steps

1. **Pre-canary verification (read-only):** UTC timestamp, re-hash the five approved C4A.3 files plus the eight portal-sender files (any drift = STOP), HEAD/rollback source, cron job 1 `*/30 * * * *` health for the recent runs, current runtime error state, a live probe that `process-rss-feed` logs are retrievable, and the **actual current configuration state of `DIGITAL_CLIENT_MATCHER_MODE`** — reported exactly as observed (absent, or present with its effective value) rather than assumed absent.
2. **Activate shadow:** the only authorized mutation is whatever minimum change yields `DIGITAL_CLIENT_MATCHER_MODE=shadow` (create the secret if absent, update it if present). Nothing else. Record the observed previous value and the new value. No source edit, no redeploy requested by us (the platform may restart function runtimes to pick up the secret; that is not a code deployment).
   - Note: the secret is project-wide. The currently deployed `reanalyze-articles` bundle predates C4A.3 and therefore contains no shadow code, so the flag is inert for it. This will be re-confirmed before setting.
3. **Observe 3 natural cron runs** (~16:00, 16:30, 17:00 UTC, subject to actual schedule). No manual invocation. Per run: timestamp, run ID if exposed, result, articles processed/inserted/skipped, runtime errors, shadow diagnostic count, shadow error count, AI calls. Insert-path health is corroborated read-only via hourly `news_articles` counts.
4. **Aggregate comparison** from `digital_client_matcher_shadow` log lines: articles evaluated, legacy vs shadow match counts, exact agreements, legacy-only, shadow-only, differing sets, disagreement rate, invalid-UUID drops, rejection reasons, shadow exceptions. Representative disagreements limited to id/title/old/proposed/evidence.
5. **Safety verification and rollback rule:** confirm no authoritative change, no ingestion regression, no DB/schema/RLS/cron/unrelated-function change. Rollback restores the **exact pre-canary configuration** observed in Step 1: if the secret was absent → delete `DIGITAL_CLIENT_MATCHER_MODE`; if it was present as `legacy` → restore `DIGITAL_CLIENT_MATCHER_MODE=legacy`; if any other unexpected pre-existing state is observed in Step 1, STOP before activation and report rather than guessing. Deletion is not assumed equivalent to the pre-canary state. The deployed C4A.3 code is not rolled back absent evidence it caused a regression.
6. **Final report** in the requested format, ending with exactly one verdict.

## Timing

The canary spans ~90 minutes of natural cron traffic, so the final report arrives after the third observed run; interim status will be reported as runs complete.
