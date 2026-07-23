# Prensa Escrita — Audit & Recommendations

## What this section does

Prensa Escrita ingests newspaper PDFs (or JPG/PNG), sends them to Gemini for OCR + analysis, extracts per-article "recortes" (clippings), matches them against configured clients/keywords, indexes them for semantic search, and exposes them through Upload / Results / Historial tabs.

## Current tech stack

Frontend
- React + Vite + Tailwind + shadcn/ui, TanStack Query
- Page: `src/pages/PrensaEscrita.tsx`
- Tabs shell: `src/components/prensa-escrita/PressTabsContainer.tsx` (Subir PDF, Resultados, Historial)
- Upload UI: `upload/PDFUploadContainer.tsx`, `PDFFileSelector`, `PDFUploadForm`, `PDFUploadProgress`
- Results UI: `results/ResultsContainer.tsx`, `DocumentSummaryCard`, `ClippingsGrid`, `PressClippingCard`
- History: `history/ProcessingHistoryContainer.tsx` (last 20 `pdf_processing_jobs`)
- Search UI (component exists but not wired to any tab): `search/SearchClippingsContainer.tsx`
- Report generation: `GenerateReportButton.tsx` → `generate-report` edge function
- PDF thumbnail: `usePdfThumbnail`

State + orchestration hooks (`src/hooks/prensa/`)
- `usePdfProcessing` — top-level facade
- `useFileProcessing` — branches on `FEATURES.USE_FILE_SEARCH`
- `useJobManagement` + `useJobPolling` + `useJobStatusCheck` — legacy polling loop
- `usePressSearch` — invokes `search-press-filesearch` or `search-press-clippings`
- `usePdfClippings` — local clippings state

Services
- `src/services/prensa/fileProcessor.ts` — creates job row, uploads to `pdf_uploads` bucket, invokes edge functions
- `src/config/features.ts` — `VITE_USE_FILE_SEARCH` flag (currently `"true"` in `.env`)

Supabase edge functions
- `process-press-pdf` (legacy Gemini OCR page-by-page, 1345 lines)
- `process-press-pdf-filesearch` (Gemini File Search API flow, active)
- `compress-press-pdf` (only used on legacy path)
- `check-pdf-job-status` (used by legacy polling)
- `search-press-clippings` (OpenAI embeddings + `match_press_clippings` RPC)
- `search-press-filesearch` (File Search API query)
- `generate-report`

Data
- Tables: `pdf_processing_jobs`, `press_clippings`, `press_file_search_documents`, `pdf_batch_tasks`, plus catalogs `press_sources`, `press_sections`, `press_genres`, `press_rates`, `clients`, `categories`
- Storage: `pdf_uploads` bucket
- AI: Gemini (OCR + analysis + File Search), OpenAI text-embedding-3-small (legacy semantic search)

## How it works today (File Search path — active)

1. User picks PDF (max 100 MB), types publication name, optional date.
2. `useFileProcessing` uploads the file to `pdf_uploads/{ts}_{name}` and calls `process-press-pdf-filesearch` with `{storagePath, publicationName, userId, fileName, fileSize, publicationDate}`.
3. Edge function loads active clients + categories, uploads the PDF to Gemini File Search store, runs analysis, returns `{documentId, summary, clippingsCount, categories, keywords, relevantClients}` and writes `press_file_search_documents` + `press_clippings`.
4. Frontend simulates a "completed" job (no polling) and shows `DocumentSummaryCard` + clippings grid.

Legacy path (kept behind flag) creates a `pdf_processing_jobs` row, compresses the PDF, invokes `process-press-pdf`, and polls `check-pdf-job-status` every few seconds until status = completed/error.

## Flaws and bugs found

Critical / functional
1. Search tab is missing. `SearchClippingsContainer` is implemented but `PressTabsContainer` only exposes Subir/Resultados/Historial. Semantic search is unreachable from the UI.
2. File Search jobs do not create a `pdf_processing_jobs` row, so Historial (which reads only that table) never shows File Search runs — the entire Historial tab looks empty for the active pipeline.
3. Historial fetch has no `user_id` filter and no auth scoping in the client query; RLS may make it appear empty for non-admin users, or leak other users' jobs for admins. `ProcessingHistoryItem` also has no way to re-open a past job's clippings.
4. File Search path never reports progress: `useFileProcessing` fakes 90% progress then calls `onProcessingComplete([], …)`. If the edge function takes 60–120s, the UI shows a spinner with no ETA and the failsafe timeout in `useJobManagement` doesn't apply (no job row).
5. `useFileProcessing` sets `isUploading` to `false` only on error; on success it delegates to `usePdfProcessing`'s effect, which relies on `currentJob.document_summary`. If Gemini returns an empty summary the UI stays stuck in "Procesando…".
6. `usePressSearch` caches results in React state and never invalidates when new documents are ingested — stale hits after a fresh upload.
7. `check-pdf-job-status` fallback matches "recent clippings by publication_name" for the same user across all jobs — collisions when the same outlet is uploaded twice.
8. `useJobPolling` returns `isPolling` from a ref (never reactive) — dead value.
9. Legacy `process-press-pdf` (1345 lines) is still deployed and reachable; it duplicates client/category logic and is now a maintenance liability.
10. No cancel for File Search runs — `cancelProcessing` only clears local state; the edge function keeps running and bills.

UX / polish
11. Copy claims "PDF o Imagen (JPG/PNG)" but `PDFFileSelector` only advertises PDFs — verify accept list and messaging match.
12. `ResultsContainer` shows one large summary + grid but no filters (by category, client, page, sentiment). Hard to navigate 30+ clippings.
13. No client filter chips on results despite `client_relevance` being extracted per clipping.
14. No delete / retry button on Historial items; failed jobs just sit there.
15. `GenerateReportButton` only receives current in-memory clippings, so reports from Historial are impossible without re-processing.
16. Publication date defaults to today with no validation against filename or Gemini-detected date.
17. No pagination on Historial (hard-coded limit 20), no search.
18. Toast on upload always says "puede tomar varios minutos" — no live status.

Data / security
19. `pdf_uploads` storage path is user-independent (`{ts}_{name}`) — collisions across users; also potential PII leakage if bucket is public.
20. `press_clippings` are keyed by `file_path`; File Search path stores a Gemini file id, so the legacy `check-pdf-job-status` join by `file_path` would return zero rows.
21. No cleanup job for stale PDFs in `pdf_uploads` or orphaned entries in `press_file_search_documents`.
22. `OPENAI_API_KEY` still required for legacy semantic search even though project standard is Lovable AI / Gemini embeddings.

Reliability
23. No idempotency key on upload — clicking submit twice creates two Gemini File Search documents and duplicate clippings.
24. Failsafe timeout only fires on legacy path.
25. No error boundary around Historial (only around the page as a whole).
26. `useJobStatusCheck` counts consecutive errors but resets `setCurrentJob(null)` inside `useJobManagement`, losing the failed job before Historial can surface it.

## Recommended new/updated functionality (prioritized)

P0 — make it fully usable
- Add "Buscar" tab back to `PressTabsContainer` wired to `SearchClippingsContainer`.
- Persist every File Search run into `pdf_processing_jobs` (status=`completed`, store `document_summary` / `document_metadata`) so Historial and reports work uniformly.
- In `ProcessingHistoryItem`, add "Ver resultados" that loads that job's clippings/summary back into the Results tab (via a `useJobDetail(jobId)` fetch).
- Show real progress for File Search: stream status from the edge function (e.g. write progress updates to the job row and subscribe via Realtime) or at minimum emit periodic status logs the frontend polls.

P1 — quality
- Results filters: multi-select by client, category, page range; text filter within the document.
- Add delete + retry actions on Historial items; add pagination + search + status filter.
- Scope Historial query by `user_id` (or by role) and enable RLS-aware ordering.
- User-scoped storage paths (`pdf_uploads/{user_id}/{ts}_{name}`) and signed URLs.
- Idempotency: hash the file, look up existing `press_file_search_documents` before uploading again; offer "Ya procesado — ver resultados".
- Cancel button on File Search flow (mark job cancelled + tell edge fn via a `cancelled` flag it checks between steps).

P2 — hardening & cleanup
- Retire the legacy `process-press-pdf` + `compress-press-pdf` + `check-pdf-job-status` + `search-press-clippings` code paths once File Search is confirmed stable; drop the `VITE_USE_FILE_SEARCH` flag.
- Move semantic search embeddings to Lovable AI (`google/text-embedding-004`) to remove the OpenAI dependency.
- Nightly cleanup for `pdf_uploads` older than N days and orphan File Search documents.
- Client-side Zod validation on file type/size, MIME sniffing, and a hard cap enforced server-side.
- Wrap Historial and Results in `ErrorBoundary`; add empty/loading skeletons for the "loaded past job" case.
- Add unit tests for `usePdfProcessing` state transitions and an integration test that walks upload → results → historial.

## Suggested delivery order
1. Wire Search tab + Historial persistence for File Search runs (P0 items 1–3).
2. Real progress + "Ver resultados" from Historial + filters on Results (P0 item 4, P1 filters).
3. Retire legacy pipeline + move embeddings to Lovable AI + cleanup jobs (P2).
