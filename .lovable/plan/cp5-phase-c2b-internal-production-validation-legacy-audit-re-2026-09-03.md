# CP5 Phase C2B — Internal Production Validation + Legacy Audit Reconciliation

Read-only. Internal project `qpozetnbnzdinqkrafze` (media-mosaico). No migrations, writes, deployments, sender invocations, or Portal changes were made.

## Verdict up front

Only **Digital (news RSS)** is close to Portal-ready. **TV, Radio, Press and Social are not V1-safe** as-is: their client-mention data is either absent, capture-time-only, or fabricated at scale.

| Medium | Content persisted | Trustworthy client mentions | Trustworthy air/publication time | V1 verdict |
|---|---|---|---|---|
| Digital (news) | Yes (48,650 rows) | Mostly (24,558 enriched; IDs unsafe) | Yes (`pub_date`) | Conditional go |
| Social | Yes (102,282 rows) | No (533 of 102,282) | Yes (`pub_date`) | No-go |
| Radio | Yes (50,117 transcripts) | No (5 rows analyzed) | No (capture time only) | No-go |
| TV | Yes (8,175 completed) | No (roster dumps) | No (all nulls) | No-go |
| Press | No new since 2025-11-16 | No | Partial (72 legacy rows) | No-go |

## Reconciliation of the two reference documents

- **WolfPack PDF (cutoff 2026-08-27)** — treated as historical baseline. Live production supersedes its counts; volumes have grown and TV/Radio analysis persistence changed after its cutoff.
- **`cp5-c2-internal-source-mapping-audit.md`** — Portal-side source inspection with no DB access; its DB-dependent claims (trigger inventory, sentiment distribution, Metropistas identity, mention quality) are now resolved below by live queries.

## Live evidence

### Volumes
`news_articles` 151,368 · `radio_transcriptions` 50,248 · `tv_transcriptions` 10,568 · `transcriptions` 408 (legacy, frozen 2025-07-24) · `press_clippings` 72 · `press_file_search_documents` 23 · `clients` 28 (23 active) · `tv_news_segments` 4,112 · `typeform_responses` 52,773.

Platform partition of `news_articles`: `news` 48,650 (20 sources), `twitter` 100,347 (42), `instagram` 1,935 (13).

### Finding 1 — TV client relevance is a roster dump (blocking)
Every TV row that mentions Metropistas (499 of 499) carries 15+ clients; the average non-empty `relevant_clients` length is 19.84 against a roster of 23 active clients. A sampled row lists 22 clients, all tagged `source: analysis`, for a single newscast. TV mentions cannot be projected to the Portal — a client would see hundreds of stories it was never in.

### Finding 2 — TV has no broadcast metadata
`broadcast_time`, `channel` and `program` are null on all 10,568 TV rows. There is no air-time or outlet attribution to show in a Portal item.

### Finding 3 — Radio `horario` is capture time, not airtime
50,188 of 50,190 `horario` values fall within 120 seconds of `created_at`; none precedes `created_at` by more than 10 minutes. `emisora` and `programa` are the literal string `default` on all 50,190 rows. Radio therefore has no station, program, or airtime attribution.

### Finding 4 — Radio analysis is effectively unpersisted
Only 5 of 50,248 radio rows have `full_analysis` / `analysis_keywords`, and 0 have Metropistas in `analysis_client_relevance`, despite Metropistas appearing in radio transcript text. The 5W/analysis columns added earlier were never backfilled and are only written on new manual analyses.

### Finding 5 — Client IDs inside `news_articles.clients` are not resolvable
3,445 articles contain placeholder IDs such as `"id": "metropistas_uuid"` produced by the model. Any Portal projection must resolve mentions by canonical name/alias against `public.clients`, never by the stored `id`.

### Finding 6 — Social posts are ingested but never enriched
`process-social-feeds/feed-processor.ts` performs no AI analysis: of 102,282 social rows only 2,061 have a summary, 737 a sentiment and 533 a non-empty clients array. Social mention coverage is effectively unusable.

### Finding 7 — Press writes to a table nobody reads for clippings
The active UI path is `process-press-pdf-filesearch`, which writes only `press_file_search_documents` (23 rows, last 2026-07-24) and never inserts into `press_clippings`. `press_clippings` is frozen at 72 rows created between 2025-10-31 and 2025-11-16, and contains exact duplicate clippings (same title/page/publication inserted minutes apart). Press has no per-article record to project.

### Finding 8 — Version-safety is uneven
`updated_at` triggers exist only on `news_articles`, `tv_transcriptions`, `press_clippings`, `press_file_search_documents`. `radio_transcriptions` and `transcriptions` have **no** trigger; their `updated_at` is set ad hoc by four writers (`transcribe-audio`, `analyze-radio-content`, `useTranscriptionSave`, editor paths). Any writer that forgets it silently produces a stale version marker, so `updated_at` is not a safe change-detection key for Radio.

### Finding 9 — Aliases are empty
0 of 28 clients have aliases populated, so the alias-aware matching added to the prompts currently contributes nothing.

### Finding 10 — Lifecycle
No soft-delete/tombstone column exists on any content table; deletions are hard deletes. Failure states are retained: TV `failed:stale` 1,920 plus ~473 other failures; Radio `failed:empty_transcript` 12. A Portal projection must filter on terminal success status explicitly.

### Finding 11 — Sender and function security
`portal-sender` runtime is `index.ts`, `handler.ts`, `finalize.ts`, `auth.ts`, `signing.ts`, `clients.ts`, `deno.json`; test files live outside the deploy dir. `verify_jwt=false` is declared only for `portal-sender` and `sync-typeform-responses` in `supabase/config.toml`, both with in-code authorization. Gating secrets remain `PORTAL_SENDER_ALLOW_APPLY=false`, `PORTAL_SENDER_TEST_MODE=false`.

## Metropistas pilot candidates (canonical id `08748447-a701-4be3-80c8-7470526e0975`)

- Digital/Social: 901 `news_articles` rows name Metropistas in the clients field — e.g. `bd4d1c76-…` "Fitch mantiene la nota a deuda de Metropistas" (2026-06-21, digital) and `56337ab4-…` PR-52 bridge closure (2026-07-17, Twitter).
- TV: 499 rows, all roster dumps — zero usable.
- Radio: text matches exist (e.g. `7bc93539-…`) but no structured mention record.
- Press: 10 clipping rows, duplicated, from the frozen legacy set.

Usable pilot volume today is Digital only, roughly 100–200 genuinely enriched digital items.

## Recommended sequencing before any Portal ingestion

1. Fix TV relevance extraction so it emits only clients actually mentioned; re-derive historical TV mentions rather than trusting stored arrays.
2. Capture real Radio/TV outlet, program and airtime at upload; stop treating `horario` as airtime.
3. Add name/alias-based mention resolution against `public.clients`; ignore stored model IDs.
4. Decide the press canonical record (`press_file_search_documents` vs per-clipping rows) and de-duplicate.
5. Add `updated_at` triggers to `radio_transcriptions` (and `transcriptions` if it stays readable) before using it as a sync key.
6. Populate client aliases.

No implementation, ingestion, or state change is included in this phase.

---

# CP5-C2B Closeout Addendum (read-only)

## 1. Digital identity resolution — quantified

Scope: `news_articles` joined to `feed_sources` where `platform='news'`, expanding `clients` array elements.

| Metric | Count |
|---|---|
| Total client objects | 63,965 |
| Objects carrying an `id` | 63,960 |
| UUID-shaped ids | 49,829 |
| UUID-shaped ids that exist in `public.clients.id` | 46,198 |
| UUID-shaped ids **not** found in `public.clients` | 3,631 |
| Invalid / non-UUID ids (e.g. `metropistas_uuid`) | 14,131 |
| Objects whose `name` matches a current `clients.name` (case-insensitive) | 60,489 |

So 72.2% of stored ids are directly canonical; the earlier "IDs unusable" wording is corrected — ids are usable **after validation**.

Adopted sender rule (as specified):
1. `id` is UUID-shaped **and** exists in `public.clients.id` → use that canonical UUID.
2. Otherwise ignore the stored id and resolve by `name` against current client names/aliases.
3. Still unresolved → emit `raw_client_name` only, no client binding.

Arbitrary model-supplied ids are never trusted.

## 2. Digital version proof

```
CREATE TRIGGER update_news_articles_updated_at
BEFORE UPDATE ON public.news_articles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger LANGUAGE plpgsql
 SET search_path TO 'public','extensions','pg_catalog'
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$
```

The trigger is row-level `BEFORE UPDATE` with no `WHEN` clause and no column list, so it fires for **every** UPDATE regardless of which columns change — including `clients`, `sentiment`, `sentiment_score`, `keywords`, `summary`, `description`, `category`, `pub_date`, `source`, and feed fields. Inserts are covered by the column default `timezone('utc', now())` on a `NOT NULL` column.

**Digital: VERSION SAFE**
`source_updated_at = news_articles.updated_at`

## 3. Digital/Social partition — confirmed and mutually exclusive

| Platform (via `feed_sources.platform`) | Rows | Sender routing |
|---|---|---|
| `news` | 48,653 | digital |
| `twitter` | 100,347 | social |
| `instagram` | 1,935 | social |
| NULL / no feed source | 436 | do not emit |

No row falls into two buckets; every `news_articles` row has exactly one `feed_source_id` (or none).

## 4. Edge Function security closeout

`supabase/config.toml` declares `verify_jwt = false` only for `portal-sender` and `sync-typeform-responses`; the three functions below therefore keep the platform default `verify_jwt = true`.

| Function | verify_jwt | Auth header required | JWT/user verification in code | Role authorization | Service-role usage | Input validation | Rate/abuse guard | Status |
|---|---|---|---|---|---|---|---|---|
| `analyze-radio-content` | true (default) | Yes (gateway) | None in code | None | Yes, service role client for the row update | Minimal (text length ≥ 10, UUID regex on row id) | None | PARTIAL |
| `process-social-feeds` | true (default) | Yes (gateway) | None in code | None | Yes | None (only `forceFetch` flag) | None | PARTIAL |
| `process-press-pdf-filesearch` | true (default) | Yes (gateway) | None in code | None | Yes | Presence checks only; **`userId` is taken from the request body** | None | OPEN |

Main exposure: `process-press-pdf-filesearch` attributes rows to a caller-supplied `userId` rather than the verified JWT subject, so any authenticated user can write records owned by another user. `analyze-radio-content` and `process-social-feeds` write with the service role on behalf of any authenticated caller, but do not accept an identity claim. No fixes applied.

## 5. Clarifications

**Radio counts.** `radio_transcriptions` holds **50,248** total rows — the whole table including failures and blanks. **50,117** is the subset with a non-empty transcript (`transcription_text` not null and not blank). The 131 difference is 12 NULL transcripts and 119 whitespace/empty transcripts.

**Aliases reclassified.** 0 of 28 internal clients have aliases populated. This is **NOT A DIGITAL C3 BLOCKER** — it is a production-scale normalization improvement, since the isolated Portal owns a tested alias-resolution layer and internal name matching already resolves 60,489 of 63,965 digital client objects.

## Final C3 gate

**Digital only is ready for a controlled Metropistas sender pilot.** TV, Radio, Press and Social remain out of scope for V1.

| Contract element | Value |
|---|---|
| Source selector | `news_articles` INNER JOIN `feed_sources` ON `feed_sources.id = news_articles.feed_source_id` WHERE `feed_sources.platform = 'news'` |
| `source_id` | `news_articles.id` (uuid) |
| `source_updated_at` | `news_articles.updated_at` |
| `effective_at` | `news_articles.pub_date` (NOT NULL) |
| Metropistas pilot `source_id` | `bd4d1c76-228b-4246-a544-cac2e3d44373` ("Fitch mantiene la nota a deuda de Metropistas", `pub_date` 2026-06-21) |
| Canonical client for the pilot | `08748447-a701-4be3-80c8-7470526e0975` (Metropistas) |

Canonical mention-resolution algorithm, per element of `news_articles.clients`:

```text
1. if element.id matches ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
     and EXISTS (select 1 from public.clients where id = element.id::uuid)
   -> client_id := that uuid                                  (46,198 objects)
2. else if lower(trim(element.name)) matches lower(clients.name)
        or lower(trim(element.name)) matches any lower(unnest(clients.aliases))
   -> client_id := matched clients.id                          (name path)
3. else -> client_id := null, emit raw_client_name = element.name
4. never use element.id when step 1 fails                      (14,131 non-UUID + 3,631 orphan UUIDs)
5. de-duplicate resolved client_ids per source_id
```

No writes, sender changes, deployments, or Portal ingestion were performed.
