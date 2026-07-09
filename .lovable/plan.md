# Supabase Error & Logs Audit Report

Produce a downloadable audit document at `/mnt/documents/PUBLITECA_SUPABASE_AUDIT.md` covering all current Supabase-side errors, warnings, and log anomalies for `app.publitecapr.com`.

## Investigation steps

1. **Database linter** — run `supabase--linter` and capture every finding (RLS gaps, SECURITY DEFINER views, missing indexes, function search_path, extension placement, auth config).
2. **Security scan** — run `security--run_security_scan` for exposed data / policy holes.
3. **Postgres logs** — query `postgres_logs` for the last 24–72h filtering `error_severity IN ('ERROR','FATAL','PANIC','WARNING')`; group by message signature and count.
4. **Auth logs** — query `auth_logs` for non-2xx statuses, failed logins, token errors, rate limits.
5. **Edge function edge logs** — query `function_edge_logs` for 4xx/5xx by function; rank offenders.
6. **Per-function logs** — pull recent logs for the noisiest functions found in step 5 (likely `process-tv-with-gemini`, `process-tv-with-qwen`, `analyze-tv-stored`, `transcribe-audio`, `analyze-radio-content`, `analyze-media-content`, `sync-typeform-responses`, `update-user-password`, RSS ingestion, notification processing). Capture stack traces and boot errors.
7. **Slow queries** — run `supabase--slow_queries` to surface expensive statements tied to timeouts.
8. **Runtime/client signals** — cross-reference with browser console (`CHANNEL_ERROR` on realtime, notification-sound `NotSupportedError`) already visible in the injected logs.

## Report structure

1. Executive summary — health score, top 5 issues, blast radius
2. Findings by severity (Critical / High / Medium / Low) with:
   - Signature / error message
   - Source (linter, postgres, auth, edge, client)
   - Frequency & timeframe
   - Affected table / function / route
   - Root cause hypothesis
   - Suggested fix + file path
3. Linter results table (id, level, name, entity, remediation link)
4. Security scan results table
5. Edge function reliability table (function, invocations, error rate, p95, sample error)
6. Postgres error signatures table
7. Auth error signatures table
8. Realtime & client-side Supabase issues (channel errors, notification sound 404, TOKEN_REFRESHED cadence)
9. Slow-query hotspots + suggested indexes
10. Cross-cutting themes (e.g. missing `search_path`, public buckets, RLS bypass patterns)
11. Prioritized remediation checklist (grouped, no P0/P1 ranking per prior preference — categorized only)
12. Appendix: raw SQL used, sample log excerpts, links to Supabase dashboard (logs, functions, SQL editor)

## Deliverable

- Single Markdown file: `/mnt/documents/PUBLITECA_SUPABASE_AUDIT.md`
- No app code changes
- No DB migrations
