# Database audit: are TV and Radio analyses being saved?

## Short answer

- **Transcripts: yes, both.** TV and Radio transcripts are persisted.
- **Analysis: TV yes, Radio no.** The TV AI analysis is written to the database. The Radio AI analysis is generated on demand and never saved — it disappears when the user leaves the page.

## What the data shows

### Transcripts (verified counts)

| Table | Rows | With transcript text | Range |
|---|---|---|---|
| `radio_transcriptions` | 49,058 | 49,046 | Apr 2025 - today |
| `tv_transcriptions` | 9,896 | 7,641 | Jun 2025 - today |
| `transcriptions` (legacy radio, unused) | 408 | 116 | Jan 2025 - Jul 2025 |

Job status: Radio is 49,046 `completed`, 11 `failed:empty_transcript`, 1 in flight. TV is 7,629 `completed` against 2,267 failures, of which 1,797 are `failed:stale` (the sweeper marking abandoned jobs) — that backlog is mostly historical, from before the reliability fix.

### TV analysis: saved

`tv_transcriptions.full_analysis` is populated on 7,456 of 7,629 completed rows. Recent months are near-complete:

```text
Month     Completed   With analysis   Completed w/o analysis
2026-08        1894           1890            7
2026-07        1723           1716           10
2026-06        1374           1309           65
2026-05        1483           1431           53
```

The structured 5W columns are also written (`analysis_quien` on 7,444 rows). Two gaps worth noting: `analysis_summary` is only on 984 rows and `analysis_category` on 1,027 — the newer Qwen/Gemini path writes the full narrative text but only sometimes extracts those individual fields. `analysis_client_relevance` is populated on exactly **1** row, so relevant-client data is effectively not stored in a queryable form for TV either. TV news segments are persisted (4,112 segments across 769 transcriptions).

### Radio analysis: not saved

`radio_transcriptions.analysis_result` looks populated (49,046 rows), but its contents are **AssemblyAI raw output**, not the AI content analysis. Keys present on recent rows: `utterances`, `entities`, `topics`, `content_safety`, plus file metadata. There is no 5W, no summary, no category, no client relevance.

The reason: `RadioAnalysis.tsx` calls the `analyze-radio-content` edge function, which returns the analysis text to the browser and performs **no database write at all**. The table has no column to hold it. Its only durable side effect is creating client-match alerts.

Consequences today:
- Radio analyses cannot be searched, reported on, or reviewed later.
- Re-opening a radio transcript re-runs the analysis (repeat AI cost) or shows nothing.
- Radio is invisible to reporting that reads analysis fields.
- Radio news segments are not stored either: `news_segments` has 0 rows (it points at the abandoned legacy `transcriptions` table).

## Proposed fix

### Phase 1 - Persist radio analysis (the actual gap)
- Migration: add nullable `full_analysis`, `analysis_summary`, `analysis_quien/que/cuando/donde/porque`, `analysis_category`, `analysis_keywords`, `analysis_client_relevance` to `radio_transcriptions`, mirroring the TV column names so reporting can treat both alike. Additive and nullable, no backfill, no read path changes for the 49k existing rows.
- `analyze-radio-content` accepts the transcription id and writes the analysis to that row before returning, using the same field-extraction helper the TV path uses.
- `RadioAnalysis.tsx` loads any saved analysis on mount instead of re-running, and only calls the function when none exists (with a manual "re-analizar" action).

### Phase 2 - Close the TV extraction gaps
- Run the existing field extractor over the TV rows that have `full_analysis` but no `analysis_summary`/`analysis_category`, so historical rows become queryable.
- Persist relevant clients for TV into `analysis_client_relevance` on new runs (currently 1 row) so client reporting works off the database rather than re-parsing text.

### Phase 3 - Cleanup (no radio segments)
- Radio news segments are explicitly out of scope; no segment storage is added.
- Decide the fate of the legacy `transcriptions` table (408 rows, dead since Jul 2025): archive or drop. No deletion happens without your confirmation.

### Goal this enables
With Phases 1 and 2 done, both `radio_transcriptions` and `tv_transcriptions` carry transcript text plus the same named analysis columns, so a single query can search and report across Radio and TV transcripts and analyses.


### Not touched
Auth, RLS, roles, section permissions, clients/taxonomy, Typeform, Prensa, Redes Sociales. No existing columns altered or dropped, no rows deleted.

## Verification
- Run a radio analysis, reload the page, confirm the analysis renders from the database with no second AI call.
- Confirm a new radio row has populated 5W and category columns.
- Confirm the TV backfill leaves 0 completed rows with `full_analysis` but empty `analysis_category`.
