## Goal

Browse Typeform alerts by date over **months of history**, fast and reliably, by mirroring Typeform responses into Supabase and adding a date-range picker to the "Alertas Enviadas" tab.

---

## Phase 1 — Date picker in UI (quick win, ships first)

1. **`src/pages/EnvioAlertas.tsx`** — Add a `DateRangePicker` above the alerts list with presets: *Hoy, Últimos 7 días, 30 días, 90 días, 6 meses, Personalizado*. Default = **last 30 days**. Reuse existing `src/components/dashboard/DateRangeFilter.tsx` pattern (or extract a shared `<DateRangePicker>` if it's too dashboard-specific).
2. **`src/hooks/use-typeform-alerts.ts`** — Accept `{ since, until }` and pass them through to the edge function. Include dates in the React Query key so changing range refetches.
3. **`supabase/functions/get-typeform-alerts/index.ts`** — Accept `since`/`until` params. In Phase 1 still call Typeform directly (forwarding `since`/`until`), so users get date filtering immediately even before the mirror is populated.

Phase 1 alone gives reliable date browsing for ranges with ≤1000 responses.

---

## Phase 2 — Supabase mirror + cron sync (the real fix)

### 2.1 Schema (migration)

New table `public.typeform_responses`:

- `id uuid pk`
- `form_type text` (e.g. `'tv'`, `'radio'`, `'redes'`, `'prensa_escrita'`, `'prensa_digital'`) — matches the existing form-type tabs
- `form_id text` — the Typeform form ID
- `response_id text` — Typeform's `response_id` (unique per form)
- `submitted_at timestamptz` — from Typeform `submitted_at`
- `landed_at timestamptz`
- `token text`
- `client_id uuid null` — best-effort match, nullable
- `client_name text null`
- `is_alert boolean` — derived from the "¿Enviar alerta?" answer
- `payload jsonb` — full Typeform response for the dialog/details view
- `raw_answers jsonb` — normalized answers for search
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- Unique constraint on `(form_id, response_id)` for idempotent upserts
- Indexes: `(form_type, submitted_at desc)`, `(client_id)`, `(is_alert)`, GIN on `raw_answers`

Plus a `public.typeform_sync_state` table with one row per `(form_type, form_id)` tracking `last_synced_at` and `last_run_status`.

RLS: read for `authenticated`; writes via `service_role` only (edge functions). Standard `GRANT` block.

### 2.2 Sync edge function

New function `sync-typeform-responses` (no JWT verify, cron-callable):

- For each configured `(form_type, form_id)`, read `last_synced_at` from `typeform_sync_state`.
- Page through Typeform `/responses?since=<last_synced_at>&page_size=1000&sort=submitted_at,asc` using `before` cursor pagination until exhausted.
- For each response: normalize answers, derive `client_id`/`client_name` (reuse existing client-match logic — confirm location with the user during build), derive `is_alert`, upsert into `typeform_responses` on `(form_id, response_id)`.
- On success, advance `last_synced_at` to the max `submitted_at` processed.
- Use `EdgeRuntime.waitUntil` with a `finally` block writing terminal status (per project memory).

### 2.3 Cron schedule

`pg_cron` + `pg_net` job every **10 minutes** invoking `sync-typeform-responses`. Created via the **insert tool**, not migration (per project rules — contains URL + anon key).

### 2.4 Read path

Rewrite `get-typeform-alerts` (or add `get-typeform-alerts-v2` and switch the hook) to query `typeform_responses` directly:

- Filter by `form_type`, `since`, `until`, optional `q` (text search across `raw_answers`), optional `client_id`.
- Server-side pagination (`limit`/`offset` or keyset on `submitted_at`).
- Returns total count for the range so the UI can show real pagination.

`use-typeform-alerts.ts` switches its source from "live Typeform" to "mirrored table"; the component API stays the same so `AlertResponseCard` / `AlertResponseDialog` don't change.

### 2.5 Backfill

One-off invocation of `sync-typeform-responses` with `since=null` (or `since=2026-01-01`) to backfill the last several months on first deploy. Triggered manually after the function deploys.

---

## Out of scope (call out, don't build)

- CSV export, per-client filtering UI, charts over time — unlocked by the mirror but not part of this change unless you ask.
- Schema for Typeform webhook ingestion (push instead of pull). Cron sync is enough for "couple of months" needs; webhooks can come later if latency matters.

---

## Technical notes

- Typeform pagination uses `before=<token>` (response token of the oldest item on the prior page) — not numeric pages. The current edge function uses `pageSize * page` which silently truncates past ~1000 records; the sync function fixes that.
- `submitted_at` from Typeform is ISO 8601 UTC — store as `timestamptz` and let the UI convert to PR time.
- Client matching: reuse whatever currently powers `client_name` in `AlertResponseCard` so historical and new rows match consistently. I'll locate that during build (likely `src/services/...` or inside the existing edge function).
- The two phases are independently shippable: Phase 1 works against live Typeform; Phase 2 swaps the read source without UI changes.

---

## Order of operations

1. Phase 1 (UI + edge function passthrough) — ship.
2. Phase 2.1 migration → 2.2 sync function → 2.5 backfill → 2.3 cron → 2.4 swap read path.
3. Verify in Alertas Enviadas: pick *Últimos 90 días*, confirm results, paginate, open a card.
