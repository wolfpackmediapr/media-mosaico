
# Changes summary — June 12 to July 2, 2026

Not an implementation plan — this is a recap of the work done in the last ~3 weeks, grouped by area.

## Dashboard

- **Buzz Words interactive cloud**: new widget on the Dashboard aggregating keywords from `news_articles` (RSS + social). Uses `d3-cloud` for layout and `framer-motion` for animated re-flow. Filterable by Day / Week (default) / Month; words are clickable and jump to search.
- **Noise filtering for Buzz Words**: added an explicit blocklist (PR outlets, handles, promo terms like "clic", "suscribete"), a dynamic blocklist built from active `feed_sources` (names + hostnames), digit-suffix regex, and stricter min-length rules (5 chars text / 3 chars AI keywords).
- **Unified feed search**: increased search debounce from 500 ms to 900 ms so typing isn't cut off.

## Alerts / Typeform

- **Typeform mirror in Supabase**: new `typeform_responses` + `typeform_sync_state` tables, plus a `sync-typeform-responses` edge function with cursor pagination, 100-row batched upserts, and Unix-timestamp `since` handling.
- **Backfill + schedule**: ~40k historical responses synced (Sept 2025 → today); cron runs every 10 minutes.
- **Alerts UI**: new `AlertsDateRangePicker` and `EnvioAlertas` now queries the Supabase mirror so you can browse months of alerts by date.
- **Copy button** added to `AlertResponseDialog` (Resumen) and to `RadioNewsSegmentCard`.
- **Inactive clients stripped from alerts**: `get-typeform-alerts` now uses an active-client cache and removes inactive names from the `clients[]` field.

## TV analysis

- **Relevant clients only**: prompts in `process-tv-with-gemini` and `_shared/tvAnalysisPrompt.ts` updated to include only ALTA/MEDIA relevance; category→keyword mapping is now built dynamically from the configured client keywords.
- **Parser sanitization**: `analysisParser.ts` strips "NO RELEVANTE" / "bajo" entries from stored analyses, including a new `stripNonRelevantClientLines` regex for plain-text/markdown blocks.
- **Anti-hallucination rules**: prompts forbid inventing names for cargos (must render "(nombre no mencionado)") and forbid pulling PR public-figure names from general knowledge.

## Social media / RSS

- **13 new government/institutional feeds** added to `process-social-feeds/constants.ts` (La Fortaleza, Jenniffer González, DDEC, INDUNIV as Instagram, Cámara de Comercio as Twitter, etc.); last 10 posts per feed ingested.
- **Instagram image proxy**: new `social-image-proxy` edge function that streams images server-side to bypass `scontent.cdninstagram.com` hotlink blocks. `image-utils.ts` and `content-sanitizer.ts` rewrite CDN URLs (and inline `<img>` tags) to the proxy. Allowlist + size guards included.

## Radio

- **Transcriptions restored**: `transcribe-audio` moved to `speech_models: ['universal-2']`, added UUID validation for `userId`, and wrapped the DB insert in try/catch so a persistence failure still returns the transcript.
- **`secure-transcribe`**: switched insertion field from the non-existent `metadata` column to `analysis_result`.
- **Qwen fallback fix**: removed unsupported Spanish AssemblyAI options (`auto_chapters`, `iab_categories`) from `process-tv-with-qwen`.

## Settings

- **Clients table layout**: `ClientsTable.tsx` no longer distorts on long keyword lists — shows the first 6 keywords inline with a `+N` popover for the rest, `align-top` cells, and truncation on long badges.

## Housekeeping / clarifications

- Explained that recent Supabase GoTrue log noise (deprecation warning + lifecycle INFO lines) is on Supabase's side and not an app issue.

Let me know if you want this exported (Markdown/PDF) or broken down per release note.
