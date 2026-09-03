# CP5 Phase C3A — Digital Content Sender (implementation + tests, no ingestion)

Extend the existing internal `portal-sender` to also mirror Digital content (`kind=content`, `media=digital`) to `POST /api/public/ingest/content`, reusing the already-approved HMAC transport, batching, replay/collision semantics and finalize lifecycle. No live ingestion, no apply mode, no Portal changes.

## Scope guarantees

- `auth.ts`, `signing.ts`, `finalize.ts` unchanged.
- Existing clients sync path stays behavior-compatible: default request (`kind` absent) behaves exactly as today, same envelope bytes, same path, same finalize.
- `PORTAL_SENDER_ALLOW_APPLY=false`, `PORTAL_SENDER_TEST_MODE=false` untouched.
- No deployment unless explicitly requested; the phase report will state whether deploy is needed before the next phase (it is not, for tests).

## Files

Added (deployed runtime):
- `supabase/functions/portal-sender/content/types.ts` — `ContentItemDTO`, `MentionDTO`, sentiment allow-list, path constant `/api/public/ingest/content`.
- `supabase/functions/portal-sender/content/digital.ts` — Digital selector/reader, row→DTO mapping, sentiment normalization, mention resolution.

Modified:
- `supabase/functions/portal-sender/handler.ts` — request now accepts optional `kind` (`clients` default | `content`) and `media` (`digital` only), plus `source_ids?: string[]`; dispatches to the Digital reader and the content ingest path; everything else (batching, signing, diagnostics gating, accepted-batch gating, finalize) is shared unchanged.

Added (tests, outside runtime dir per convention):
- `supabase/function-tests/portal-sender/digital_content_test.ts`

## Request interface (content)

```json
{
  "kind": "content",
  "media": "digital",
  "mode": "dry_run",
  "source_ids": ["bd4d1c76-228b-4246-a544-cac2e3d44373"],
  "limit": 100,
  "batch_size": 200
}
```

- `media` other than `digital` → 400 `UNSUPPORTED_MEDIA` (never silently mapped through Digital).
- `source_ids` accepts UUIDs only (400 `INVALID_SOURCE_ID` otherwise); rows are always fetched through the Digital selector, so a UUID whose feed source is twitter/instagram/NULL simply is not returned.
- No caller-provided SQL, table names, or filter fragments.

## Digital selector

`public.news_articles` joined to `public.feed_sources` on `feed_source_id`, restricted to `feed_sources.platform = 'news'` (PostgREST embedded filter with inner join semantics). Twitter, Instagram, and NULL/no-feed-source rows are excluded.

## Digital DTO mapping

| Field | Source |
|---|---|
| `source_type` | `"digital"` |
| `source_id` | `news_articles.id` |
| `source_updated_at` | `news_articles.updated_at` (VERSION SAFE) |
| `source_state` | `"active"` |
| `effective_at` | `news_articles.pub_date` |
| `effective_at_estimated` | `false` |
| `title` | `news_articles.title` (required; row rejected if missing) |
| `summary` | `news_articles.summary` |
| `body_text` | `news_articles.description` |
| `category` | `news_articles.category` |
| `media_outlet` | `news_articles.source`, fallback `feed_sources.name` |
| `article_url` | `news_articles.link` when absolute http(s) URL, else omitted |
| `image_url` | `news_articles.image_url` when absolute http(s) URL, else omitted |
| `has_media` | true only when `image_url` was emitted |

Never `created_at`, `last_processed`, export time, or `now()`. Omitted (never fabricated): `program_or_section`, `page_number`, `media_kind`, `author`, `duration_seconds`, `language`.

Sentiment allow-list (case + outer whitespace normalization only): positive/positivo→`positive`, neutral/neutro→`neutral`, negative/negativo→`negative`, mixed/mixto→`mixed`. Anything else: omit `sentiment`, keep raw in `metadata.internal_sentiment_raw`. `sentiment_score` emitted only when finite and within [-1,1]; otherwise omitted with a diagnostic metadata note — never clamped. `sentiment_source` is a single deterministic constant identifying the internal news analysis.

Metadata stays small: `feed_source_id`, internal `platform`, useful keyword metadata, sentiment diagnostics. No raw payloads, no duplicated body text.

## Mention resolution

`mentions[]` is a complete authoritative snapshot built from the whole `news_articles.clients` structure (array of objects and/or strings, mirroring the internal news transformation shapes). Per element:

1. Stored `id` UUID-shaped AND present in `public.clients.id` → canonical UUID.
2. Otherwise the stored id is fully ignored (`metropistas_uuid`-style values can never reach Portal).
3. Resolve raw name against current `public.clients` by normalized exact name, then internal aliases.
4. Confident resolution → `raw_client_id` = canonical UUID plus `raw_client_name` = original source name.
5. Unresolved → `raw_client_name` only.
6. Never fabricate or hash a UUID.
7. Deduplicate by final canonical UUID per item (unresolved names deduped by normalized name).

No `relevance`, no `relevance_score`, no per-mention sentiment copy, and `matched_keywords` only when defensibly tied to that client — otherwise omitted.

The client lookup table (id, name, aliases) is loaded once per invocation through the internal service-role read and injectable in tests.

## Tests (all in-process, no network, no Portal)

Selector: news accepted; twitter, instagram, NULL platform rejected. Mapping: exact `source_id`, `updated_at`→`source_updated_at`, `pub_date`→`effective_at`, `effective_at_estimated=false`, required-title validation, deterministic serialization. Identity: canonical stored UUID accepted, placeholder non-UUID ignored, orphan UUID ignored, name fallback resolves, unresolved name emitted without UUID, duplicates merged, full mention set emitted, relevance omitted. Sentiment: English and Spanish mapping, unknown omitted with raw metadata, out-of-range/NaN score omitted. URLs: invalid `article_url` and `image_url` omitted, `has_media` false.

Fixed pilot fixture: `bd4d1c76-228b-4246-a544-cac2e3d44373`, title "Fitch mantiene la nota a deuda de Metropistas", canonical Metropistas `08748447-a701-4be3-80c8-7470526e0975` — mapped and asserted locally only, never sent.

Existing `auth_test.ts`, `finalize_test.ts` (signing vector, clients sender, finalize lifecycle) must stay green; `deno check` on the runtime bundle must pass.

## Report returned at the end

Files added/modified, architecture, final DTO mapping, mention-resolution implementation, exact content request interface, test counts/results, regression results, typecheck result, security invariant confirmation (gates unchanged, no secret changes, no invocation), SHA-256 of critical sender files, deployment status, and the redacted pilot DTO preview.

## C3A implementation guardrails (approved addendum)

media-mosaico is the live Publiteca internal production dashboard. C3A is source-code + tests only: no deployment, no publish, no `portal-sender` invocation, no Portal ingest/finalize calls, no DB/schema/RLS/Storage/secret changes, no cron or pipeline changes.

1. Strict request combinations. `kind` absent → clients (exact current behavior). Contradictory parameters are rejected, never ignored: `kind=clients` with `media` → 400; `kind=clients` with `source_ids` → 400; `kind=content` without `media` → 400; `kind=content` with `media != digital` → 400.

2. Bounded input. `source_ids` must be UUIDs only, deduplicated, with a hard maximum (200). `batch_size` is bounded to the Portal maximum of 200 items per content request; a larger requested value is rejected rather than emitting a Portal-invalid batch.

3. Conservative name matching only. Fallback resolution uses deterministic exact matching: trimmed/case-normalized current name, then exact internal alias. No fuzzy, substring, similarity, AI, or heuristic matching. Uncertain → `raw_client_name` only, leaving resolution/quarantine to the isolated Portal.

4. No silent drops. For `source_ids` requests the response reports per-ID disposition: requested, found as Digital, rejected/non-Digital, not found, mapping failed. A Twitter UUID must produce an observable diagnostic.

5. Mapping errors are deterministic. Missing title, missing `updated_at`, missing `pub_date`, or malformed source identity produce a mapping failure before any transport; no partially valid DTO, no fabricated required values.

6. Pilot mention set. The report for `bd4d1c76-228b-4246-a544-cac2e3d44373` must show total source client identities, total resolved canonical clients, total unresolved names, and the final deduplicated `mentions[]` — Metropistas is not assumed to be the only client, and C3C apply is not implied.

7. Sentiment. The exact `sentiment_source` constant is stated in the report. Invalid scores omitted, never clamped. Article-level sentiment is never copied into mentions.

8. Regression protection. Report `handler.ts` SHA-256 before and after plus the exact functional diff, and prove: auth tests green, existing clients sender tests green, signing vector unchanged, finalize tests green, Digital tests green, `deno check` clean. No unrelated refactoring.

STOP after tests and report.
