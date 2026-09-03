# CP5-C4A.3D1A — SHADOW OBSERVABILITY REPORT

Read-only investigation. No shadow activation, no source edit, no deploy, no invocation, no DB write, no schema/RLS/cron change. `DIGITAL_CLIENT_MATCHER_MODE` remains absent; effective mode remains legacy.

## ROOT OBSERVABILITY FINDING

`process-rss-feed` console output is **not missing — it is short-lived and was queried through the wrong interface**.

Established from the analytics log interface (read-only, this turn):

- `process-rss-feed` (`function_id = d8679615-30c4-491f-ab17-d888aa8ca7ed`) emitted **629 log lines** for the 16:30 UTC natural cron run, retrieved successfully at 16:34 UTC from `source = 'function_logs'`, including per-article `Article already exists (link match)` lines and the `shutdown` event.
- The queryable window is effectively the **current rolling hour**. Identical queries bounded at 24 h and 72 h, and one bounded with an explicit `toDateTime('2026-09-02 00:00:00')` lower bound, all returned rows only for the `2026-09-03T16:00` bucket (oldest line 16:25:49, newest 16:34:48). The same one-hour ceiling applies to `edge_logs`, `function_edge_logs`, `postgres_logs`, `auth_logs`, `storage_logs`.
- Consequence: the D0 15:30 run was visible when queried at ~15:31; the same run was unretrievable later because it had aged out. The C4A.3D1 hold was caused by **query timing relative to a ~1-hour retention window**, not by a broken logging path.
- The dedicated edge-function-log tool returns only a small capped recent slice, which at hold time contained only `shutdown` events — that is why it looked like "no logs".

No speculation beyond this is offered: platform-side retention configuration is not exposed through any interface available here.

## OPTION 1 — EXISTING LOGGING

- **viable: YES (with a timing constraint)**
- evidence: full 629-line retrieval of the 16:30 run from `function_logs`; per-source hourly bucket counts showing a single retained hour across all sources.
- exact retrieval method:
  ```sql
  select timestamp, event_message
  from logs
  where source = 'function_logs'
    and log_attributes['function_id'] = 'd8679615-30c4-491f-ab17-d888aa8ca7ed'
    and timestamp > now() - interval 1 hour
    and match(event_message, 'digital_client_matcher_shadow')
  order by timestamp desc
  limit 200
  ```
  Constraint: each natural cron run (`*/30`) must be harvested **within ~45 minutes** of firing, before it ages out. A D1 retry therefore becomes a polling exercise: poll shortly after each of the three runs and persist the extracted diagnostics into the report as they are collected, rather than aggregating at the end.
- changes required: **none** — no source, schema, RLS, cron, or infrastructure change.

## OPTION 2 — EXISTING DURABLE SINK

- **viable: NO**
- candidate inspected: `public.processing_errors` (the only diagnostic-shaped table; `content_processing_jobs`, `conversion_jobs`, `pdf_processing_jobs`, `notification_delivery_log` are authoritative workflow/delivery tables and are out of scope).
  - purpose: production ingestion/processing failure log, actively written (58,715 rows, newest 16:00:04 UTC today).
  - interface: `id uuid pk`, `stage text not null`, `error_message text not null`, `article_info jsonb`, `raw_content text`, `created_at timestamptz default utc now()`.
  - RLS enabled, 1 policy, **0 non-internal triggers**.
- risks: writing ~30–60 non-error shadow rows per cron run into an error table would contaminate production error monitoring and any error-rate reporting built on it, and would force a semantic lie (`error_message` holding a comparison payload). Retention/cleanup behavior for this table is undocumented in-repo.
- verdict: technically writable, semantically inappropriate — rejected under the "do not repurpose an unrelated production table" rule.
- changes required if it were used: source change in `process-rss-feed` plus redeploy — not recommended.

## OPTION 3 — DEDICATED DIAGNOSTICS SINK (contingency design only, not to be created)

Only needed if Option 1's one-hour window proves unworkable in the D1 retry.

Table `public.digital_matcher_shadow_log`:

```sql
id            uuid primary key default gen_random_uuid()
created_at    timestamptz not null default now()
matcher_version text not null
article_id    uuid          -- news_articles.id, no FK (avoid cascade coupling)
source_id     uuid
title_label   text          -- title truncated to 160 chars, no body/description
legacy_ids    uuid[] not null default '{}'
legacy_names  text[] not null default '{}'
shadow_ids    uuid[] not null default '{}'
shadow_names  text[] not null default '{}'
added         uuid[] not null default '{}'   -- shadow-only
removed       uuid[] not null default '{}'   -- legacy-only
unchanged     uuid[] not null default '{}'
rejected_name_count int not null default 0
rejected_id_count   int not null default 0
rejected_reasons    text[] not null default '{}'
ai_names      text[] not null default '{}'   -- reused from existing analysis, no new AI call
evidence      jsonb                          -- bounded provenance array from computeShadowDiagnostic
shadow_error  text                           -- populated only on shadow exception
```

- primary key: surrogate `uuid`. No natural key; replays are expected to append.
- indexes: `create index on public.digital_matcher_shadow_log (created_at desc)` only. No others until a query pattern justifies one.
- RLS: `enable row level security`; **no** `anon`/`authenticated` policies. Grants: `grant all on public.digital_matcher_shadow_log to service_role;` only. Edge functions use the service role, so no policy is required for the writer.
- triggers: **NONE**.
- emit location: `supabase/functions/process-rss-feed/index.ts`, inside the existing post-insert shadow block (the `try/catch` that already wraps `computeShadowDiagnostic` / `logShadowDiagnostic`), replacing/augmenting the `console.log` call only.
- error isolation: the insert stays inside that same local `try/catch`, executed strictly after the authoritative `news_articles` insert. A write failure is caught, logged to console, and discarded — **fail-open**; it cannot alter or prevent the legacy insert or client assignment.
- expected write volume: 1 row per newly inserted article. Recent runs insert ~0–10 articles per 30-minute cycle → ~20–500 rows/day, a few hundred KB at most for the canary.
- retention/cleanup: manual `delete from public.digital_matcher_shadow_log where created_at < now() - interval '7 days'` during the canary; full removal is `drop table public.digital_matcher_shadow_log;` plus reverting the single emit line.

## RECOMMENDED APPROACH

**USE EXISTING LOG OBSERVABILITY — NO CODE CHANGE REQUIRED**

The diagnostics path already works; the D1 retry only needs a harvest cadence matched to the ~1-hour log window. This keeps matcher logic, `process-rss-feed`, portal-sender, `reanalyze-articles`, schema, RLS and cron all untouched, and requires no redeployment.

## SOURCE IMPACT ANALYSIS

Under the recommended approach: **zero files change**, no function redeploys, approved C4A.3 matcher logic untouched, all 13 approved hashes remain valid.

Under the Option 3 contingency only: one file (`supabase/functions/process-rss-feed/index.ts`), one block (the existing post-insert shadow `try/catch`), ~10 lines; `process-rss-feed` redeploy required; no other Edge Function redeploy; matcher modules unchanged.

## PROPOSED NEXT CONTROLLED STEP

`CP5-C4A.3D1-RETRY` (requires explicit authorization; not executed now):

1. Re-verify the 13 approved hashes and the current `DIGITAL_CLIENT_MATCHER_MODE` state.
2. Re-run the live log probe immediately before activation to confirm the current-hour window is populated.
3. Set `DIGITAL_CLIENT_MATCHER_MODE=shadow` (minimum mutation; secret currently absent, so rollback = delete the secret).
4. After each of three natural cron runs, poll `function_logs` within ~15 minutes of the run and extract every `digital_client_matcher_shadow` line, recording results incrementally.
5. Aggregate, verify no authoritative or ingestion change, restore the exact pre-canary configuration, and report.

Escalate to Option 3 only if step 4 loses a run despite prompt polling.

STOP — awaiting explicit approval.
