## Phase 2 — Supabase mirror + cron sync

Supabase access is confirmed (`select 1` succeeded against sb1-uj6a984i).

### Step 1 — Migration: mirror tables

Create in `public`:

**`typeform_responses`**
- `id uuid pk default gen_random_uuid()`
- `form_type text not null` — `'tv' | 'radio'` (and future form types)
- `form_id text not null`
- `response_id text not null`
- `token text`
- `submitted_at timestamptz not null`
- `landed_at timestamptz`
- `title text`, `summary text`, `category text`, `channel text`, `program text`
- `clients text[] default '{}'`, `tags text[] default '{}'`
- `is_alert boolean default false`
- `raw_answers jsonb default '{}'::jsonb`
- `payload jsonb default '{}'::jsonb` — full Typeform item
- `created_at timestamptz default now()`, `updated_at timestamptz default now()`
- `unique (form_id, response_id)`
- Indexes: `(form_type, submitted_at desc)`, GIN on `raw_answers`, GIN on `clients`
- Trigger: `update_updated_at_column()` on update

**`typeform_sync_state`**
- `form_id text primary key`
- `form_type text not null`
- `last_synced_at timestamptz` (nullable on first run)
- `last_run_at timestamptz`
- `last_run_status text` — `'ok' | 'error' | 'running'`
- `last_error text`
- `updated_at timestamptz default now()`

**Grants & RLS** (per project memory):
```sql
GRANT SELECT ON public.typeform_responses TO authenticated;
GRANT ALL ON public.typeform_responses TO service_role;
GRANT SELECT ON public.typeform_sync_state TO authenticated;
GRANT ALL ON public.typeform_sync_state TO service_role;

ALTER TABLE public.typeform_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typeform_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read typeform_responses" ON public.typeform_responses
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth read typeform_sync_state" ON public.typeform_sync_state
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
```
Writes happen only via `service_role` from the sync edge function — no INSERT/UPDATE policies for `authenticated`.

### Step 2 — `sync-typeform-responses` edge function

New function, `verify_jwt = false` (cron-triggered). For each `(form_type, form_id)` in:
- `'radio'` → `ngv41rGM`
- `'tv'` → `TYPEFORM_TV_FORM_ID` (if set)

Logic:
1. Read row from `typeform_sync_state`; use `last_synced_at` as `since` (omit on first run for full backfill).
2. Page through `https://api.typeform.com/forms/{id}/responses?page_size=1000&completed=true&sort=submitted_at,asc&since=<iso>&before=<token?>`. Continue while `items.length === page_size`, advancing `before` to the **oldest** item's token per Typeform's cursor semantics.
3. Reuse the schema-driven normalization from `get-typeform-alerts` (title/summary/category/channel/program/clients/tags/`is_alert`). Extracted into `_shared/typeformNormalize.ts` so both functions agree.
4. Upsert into `typeform_responses` on `(form_id, response_id)`.
5. Update `typeform_sync_state` with new `last_synced_at = max(submitted_at)`, `last_run_status`, `last_error`. Use `EdgeRuntime.waitUntil` with a `finally` that always writes terminal status.
6. Accept optional POST body `{ form?: 'tv'|'radio'|'all', since?: string }` so we can trigger a manual backfill.

### Step 3 — Manual backfill

After deploy, call `sync-typeform-responses` once with `{ since: '2025-09-01' }` (≈9 months back) via `curl_edge_functions`. Verify row counts and most-recent `submitted_at` against Typeform.

### Step 4 — Cron schedule

Enable `pg_cron` + `pg_net` and schedule every 10 minutes via the **insert tool** (contains anon key, must not go in migration):
```sql
select cron.schedule(
  'sync-typeform-responses-10m',
  '*/10 * * * *',
  $$ select net.http_post(
       url := 'https://qpozetnbnzdinqkrafze.supabase.co/functions/v1/sync-typeform-responses',
       headers := '{"Content-Type":"application/json","apikey":"<ANON>"}'::jsonb,
       body := '{}'::jsonb
  ); $$
);
```

### Step 5 — Switch the read path

Replace the Typeform-live read in `get-typeform-alerts` with a Supabase query:
- Filter: `form_type in (...)`, `submitted_at >= since`, `submitted_at <= until`, optional `ilike` over `title/summary/program/channel` plus `clients @> array[...]` for client filter, plus tag filter.
- Server-side pagination: `range(start, end)` with `{ count: 'exact' }` so the UI gets a real `total`.
- Keep the same response shape (`{ items, total, errors, tvFormConfigured }`) so `useTypeformAlerts`, `EnvioAlertas`, and `AlertResponseCard` need no changes.
- Active-client filtering (already in place) stays — applied to `clients[]` post-query, same logic.

### Step 6 — Verify

1. `curl_edge_functions` → `sync-typeform-responses` (no body) → expect `200`, check `typeform_sync_state.last_run_status = 'ok'`.
2. `read_query` → `select form_type, count(*), max(submitted_at) from typeform_responses group by form_type`.
3. In Alertas Enviadas: switch to *Últimos 90 días* and *Últimos 6 meses*; confirm rows appear, pagination total matches a DB count, and `AlertResponseCard` opens the dialog with the same fields as before.

### Out of scope (call out, don't build)

- Webhook ingestion (push). Cron is enough for "couple of months" needs.
- CSV export, per-client filter UI, charts. The mirror unlocks these; build on request.
- Schema additions for prensa/redes forms — only `tv` + `radio` are wired today; add new form types when their IDs exist.

### Order of execution

1. Migration (step 1) → wait for approval.
2. Create `_shared/typeformNormalize.ts` + `sync-typeform-responses` function → auto-deploys.
3. Backfill via `curl_edge_functions` (step 3).
4. Schedule cron via insert tool (step 4).
5. Swap `get-typeform-alerts` read path (step 5).
6. Verify (step 6).
