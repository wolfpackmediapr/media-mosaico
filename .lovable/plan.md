

# Plan: Revert to Stable Gemini Models

## Status: ✅ COMPLETED

All 17 model references across 9 edge function files have been updated from `gemini-2.5-flash-preview-05-20` to `gemini-2.5-flash`.

## Changes Made

| File | Occurrences | Status |
|------|-------------|--------|
| process-tv-with-gemini/index.ts | 5 | ✅ |
| process-tv-with-gemini/gemini-unified-processor.ts | 1 | ✅ |
| process-tv-with-gemini/gemini-client.ts | 1 | ✅ |
| analyze-tv-content/index.ts | 2 | ✅ |
| process-press-pdf/index.ts | 3 | ✅ |
| process-press-pdf-filesearch/index.ts | 2 | ✅ |
| search-press-filesearch/index.ts | 1 | ✅ |
| reanalyze-articles/index.ts | 1 | ✅ |
| process-rss-feed/index.ts | 1 | ✅ |

## Note
- Embedding model `text-embedding-005` was kept unchanged (valid model)
- All functions use stable `gemini-2.5-flash` (available until June 17, 2026)
