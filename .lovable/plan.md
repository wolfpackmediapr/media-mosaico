# Phase 0 — Portal Foundation (design only, no implementation)

This is the verified Phase 0 architecture for the Client Portal. Nothing is built or migrated until you and your reviewer sign off. Existing Publiteca behavior is untouched: no legacy table is dropped, altered, or renamed, and no current UI, edge function, or permission path changes.

## Verified production baseline (queried live, Aug 27 2026)

| Fact | Value |
|---|---|
| clients | 28 total, 23 active |
| clients with aliases populated | **0** (column exists, unused) |
| news_articles | 146,543 rows; 24,077 carry client matches |
| news client mention objects | 61,859 total, 48 distinct names |
| → resolvable by embedded UUID | 43,941 |
| → resolvable by exact lowercased name | 58,579 (superset of UUID path) |
| → unresolved | ~3,280 (top: "NF Energía" 2,167, "Coop de Seguros Múltiples" 1,072, 17 nulls) |
| typeform_responses | 51,517 rows; 93,034 client values, 36 distinct |
| → resolvable by name | 77,434; unresolved ~15,600 (top: "NF Energía" 7,531, "Pavia" 4,663, "Seguros Múltiples" 750) |
| radio_transcriptions / tv_transcriptions | 49,133 / 9,941 |
| press_clippings | 72 (frozen since Nov 2025) |

Note the mention shape is `{id, name, relevance}` with `relevance` in lowercase Spanish (`alta|media|baja`). Unresolved values are mostly **alias drift** ("Pavia" vs "Pavía", "Seguros Múltiples" vs "Coop de Seguros Múltiples") plus a handful of junk ("María", "Sonia", "AGENCIAS DE GOBIERNO", test clients) — which confirms the alias table + quarantine design.

## Checkpoint 1 — Schema only

Tables created in `public`, each with GRANTs, RLS enabled, and policies (Postgres does not grant `public` schema privileges by default).

1. **content_items** — canonical projection. Columns as you specified. `source_type` is a new enum `portal_source_type` (`digital|social|radio|tv|press|typeform`). `source_id text NOT NULL` (not uuid — typeform uses `response_id` strings). `sentiment_source text`, `metadata jsonb NOT NULL DEFAULT '{}'`. Unique `(source_type, source_id)`.
2. **content_client_mentions** — FKs to `content_items(id) ON DELETE CASCADE` and `clients(id) ON DELETE RESTRICT`. Unique `(content_item_id, client_id)`. `relevance` enum `alta|media|baja` (matches existing data). `matched_keywords text[]`, `client_name_snapshot`, `keyword_snapshot`.
3. **client_aliases** — `normalized_alias` is a generated column using the existing `public.slugify`-style normalization (unaccent + lower + trim), unique on `(client_id, normalized_alias)` plus a global unique on `normalized_alias` to prevent one alias mapping to two clients.
4. **portal_client_access** — `user_id uuid` (no FK to `auth.users` per project rule), `client_id → clients.id`, `role` enum `portal_role` (`viewer|manager`), `is_active`. Unique `(user_id, client_id)`. Deliberately separate from `user_roles`/`user_profiles`; staff roles are never reused.
5. **portal_alerts** + **portal_alert_reads** — as specified; reads unique `(user_id, alert_id)`.
6. **portal_reports**, **portal_activity_log** — contract only, no generation logic.
7. **unresolved_client_matches** — quarantine, `status` enum `pending|resolved|rejected`.
8. Indexes exactly as your 0I list, plus `content_items(effective_at DESC)` and a GIN on `content_client_mentions(matched_keywords)`.
9. `updated_at` triggers reusing the existing `public.update_updated_at_column()`.

### RLS (0E)

Security-definer helper, `SET search_path = public`, mirroring the existing `has_role` pattern:

```sql
public.portal_has_client_access(_client_id uuid) returns boolean
-- exists(select 1 from portal_client_access a
--        join clients c on c.id = a.client_id
--        where a.user_id = auth.uid() and a.client_id = _client_id
--          and a.is_active and c.is_active)
```

- `content_items` SELECT: `exists (select 1 from content_client_mentions m where m.content_item_id = id and portal_has_client_access(m.client_id))` **OR** staff (`has_role(auth.uid(),'administrator')`). No blanket-read policy exists, so a direct fetch by ID of another client's item returns empty.
- `content_client_mentions`, `portal_alerts`, `portal_reports`: SELECT gated by `portal_has_client_access(client_id)`.
- `portal_alert_reads`: user sees/writes only `user_id = auth.uid()`, and only for alerts on a client they can access.
- `portal_activity_log`: insert own rows; read restricted to administrators.
- `unresolved_client_matches`, `client_aliases`, `portal_client_access`: administrator-only via `has_role`. Writes to portal tables are service-role/admin only — portal users never insert content.
- GRANTs: `authenticated` gets SELECT on portal-readable tables (+ INSERT/UPDATE on `portal_alert_reads` and `portal_activity_log`); `service_role` gets ALL; **no `anon` grants anywhere**.

## Checkpoint 2 — Resolver + dry-run tooling (no writes)

- `public.resolve_client_identity(_raw_id text, _raw_name text)` — stable SQL function returning `(client_id uuid, method text)` following your order: valid `clients.id` → normalized exact `clients.name` → `client_aliases.normalized_alias` → `null`. Normalization: trim, collapse whitespace, lower, strip accents.
- Alias seeding migration from the observed drift (`Pavia→Pavía`, `Seguros Múltiples`/`Coop de Seguros Múltiples`→ the canonical Coop client, `Cruz Roja→Cruz Roja Americana`, etc.). Names with no plausible client ("María", "Sonia", "AGENCIAS DE GOBIERNO", `Publimedia Test*`) go straight to quarantine — never silently dropped. **You approve the alias seed list before it runs.**
- Edge function `normalize-content-batch` (`{source, cursor, batch_size, dry_run}`): idempotent, restartable, cursor-based on `created_at,id`, upserts on `(source_type, source_id)` and `(content_item_id, client_id)`. `dry_run: true` writes nothing and returns the counters you listed (scanned / mentions / by_id / by_name / by_alias / unresolved / duplicates / malformed).

## Checkpoints 3–6

3. Digital Press: dry-run report → 100 rows → 1,000 → full 146k, paged.
4. Typeform: same flow; feeds `portal_alerts` later.
5. RLS penetration tests (Client A/B, User A/B, cross-read + direct-ID fetch must return zero rows) run as a scripted SQL/Deno suite you can re-run.
6. Sign-off against your twelve exit criteria.

Radio / TV / Social / Press are **not** normalized in Phase 0; they only get their column mapping documented (`docs/portal/source-mapping.md`) as the contract for Phase 1+.

## Files touched

- New migrations (schema, helpers, alias seed) — one per checkpoint, never combined with backfill.
- New: `supabase/functions/normalize-content-batch/`, `supabase/functions/_shared/clientResolver.ts`, `docs/portal/source-mapping.md`, `docs/portal/phase0-dryrun-reports/`.
- Tests: `supabase/functions/normalize-content-batch/*_test.ts` (resolver + idempotency), SQL RLS suite.
- **Zero changes** to existing `src/` code or existing edge functions in Phase 0.

## Risks

- `press_clippings` is effectively dead (72 rows); Phase 1 must decide whether to restore per-clipping writes before Press can be portal-visible.
- TV `broadcast_time` is unreliable and Radio has no structured timestamp — `effective_at_estimated` flags these; Radio/TV normalization is deliberately deferred.
- Junk client values in Typeform (person first names, test clients) will inflate quarantine on first run; expected, not a failure.
- Adding `portal_has_client_access` to `content_items` RLS makes unindexed portal queries expensive at 146k+ rows; the `(client_id, content_item_id)` index is required, not optional.

## Deliverable of this step

This document only. On approval I implement **Checkpoint 1 (schema) alone** and stop for your independent production audit.
