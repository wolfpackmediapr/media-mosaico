# Data persistence audit — readiness for a Client Portal

Findings below come from live queries against the production database today. The short version: transcripts and analyses are now saved (Radio and TV), but **almost nothing is stored in a shape a client-facing portal can query by client**, and several high-volume sources are saved raw with no analysis at all.

## What is already fine

- Radio transcripts: 49,050 of 49,061 rows have text; analysis columns now persist.
- TV transcripts: 9,896 rows, analysis text on ~7.5k, category/summary backfilled.
- Typeform alerts mirror: 51,428 rows, fully populated (clients, category, channel, tags).
- Digital news from the "news" feeds: 46,902 articles with 46,648 summaries and 42,772 sentiment values.

## Gap 1 — There is no client-to-content link table (biggest blocker)

Client matches are stored five different ways and never as a foreign key:

| Source | Where the client match lives | Rows matched |
|---|---|---|
| news_articles | `clients` jsonb | 24,017 of 146,235 |
| press_clippings | `client_relevance` text[] | 51 of 72 |
| tv_transcriptions | `relevant_clients` / `analysis_client_relevance` | 1 of 9,896 (fixed going forward) |
| radio_transcriptions | nothing exists | 0 of 49,061 |
| typeform_responses | `clients` text[] | 51,424 of 51,428 |

A portal's core query is "everything about client X between two dates, across all media." Today that requires five different text/JSON scans with no `client_id`, so renaming a client silently breaks history.

**Fix:** one `content_client_mentions` table (`client_id`, `content_type`, `content_id`, `matched_at`, `matched_keywords`, `relevance`, `sentiment`), written by every pipeline and backfilled from the five existing fields.

## Gap 2 — Social media posts are stored but never analyzed

- Twitter/X: 97,122 posts — only 2,061 summaries, 737 sentiment, 533 client matches.
- Instagram: 1,775 posts — zero summaries, zero sentiment, zero client matches.

So ~99k social posts exist as raw text a client portal cannot filter, tag, or report on.

## Gap 3 — Broadcast dates are missing for TV and Radio

`tv_transcriptions.broadcast_time` is populated on **0 of 9,896** rows; Radio only has a free-text `horario`. Every date filter in a portal would silently fall back to upload time, which is wrong for material processed days later.

## Gap 4 — Prensa Escrita no longer saves individual clippings

The current Gemini File Search pipeline writes 23 document rows holding 113 detected clippings inside a summary field. `press_clippings` (the per-article table with embeddings) has been frozen at 72 rows since Nov 2025. A portal cannot show, link, or count individual press articles.

## Gap 5 — Semantic search infrastructure is dead

`tv_news_segments` has 4,112 rows with **0 embeddings**; `news_segments` is empty. The `match_news_segments` function has nothing to search. Only `press_clippings` (72 rows) has vectors.

## Gap 6 — Alerts and reports are incomplete records

- `client_alerts`: 1,582 rows, **all radio**, spanning only May–Aug 2026, `read_at` never set. No TV, press, or digital alerts are recorded, and there is no read/unread state for a portal inbox.
- `reports`: 106 rows with **0** `file_path` values — generated reports are not retrievable afterward.

## Gap 7 — Smaller items

- Client `aliases` is empty on all 28 clients although the field and prompts support it.
- No trigram or full-text index on transcripts (Radio/TV) — portal keyword search would table-scan 59k long-text rows.
- No monetary value per mention, even though `tv_rates` / `radio_rates` / `press_rates` exist — client reporting normally expects an equivalent-value figure.
- No per-client user accounts or audit trail; portal login and "who viewed what" have no home yet.

## Suggested sequencing (for a follow-up plan)

1. **Foundation**: `content_client_mentions` table + backfill from all five sources; write it from every pipeline.
2. **Coverage**: analyze the social backlog (Twitter/Instagram) and add client matching to Radio.
3. **Time correctness**: populate `broadcast_time` for TV/Radio at capture, backfill where derivable.
4. **Press**: restore per-clipping rows from the File Search pipeline.
5. **Search**: re-enable segment embeddings + trigram indexes on transcript text.
6. **Portal surface**: alerts inbox with read state, stored report files, per-client accounts, optional media value.

## Technical notes

- Steps 1–5 are backend-only (migrations + edge function writes) and do not change the current UI.
- Backfills are large (146k articles, 99k social posts) and should run in batches through a scheduled edge function, not a single migration.
- Client matching should key on `clients.id` with `keywords` + `aliases` snapshots stored on the mention row, so historical matches survive later keyword edits.

Tell me which gaps to prioritise and I will turn the chosen ones into an implementation plan.
