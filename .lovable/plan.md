# Fix TV Analysis Card Mixing + Refresh Flicker

Three frontend-only bugs from the latest test, in order of severity. No edge function or schema changes.

## Issue 1 — Mixed cards (CRITICAL)

In the screenshot, the blue "Programa Regular" card contains only the AI's intro paragraph, and the yellow "Anuncio Publicitario" card contains `[NOTICIA 1]`, `[NOTICIA 2]`… That news content belongs in the blue card.

**Root cause:** `src/components/tv/analysis/TvFormattedAnalysisResult.tsx` lines 57–62 split the analysis on `[TIPO DE CONTENIDO: …]` and pair `parts[i]` with `contentTypes[i]`. When the AI emits a prelude paragraph **before** the first marker (which it now does), `split` produces `[prelude, programaContent, anuncioContent]` while `match` returns `[PROGRAMA REGULAR, ANUNCIO PUBLICITARIO]`. After `filter(Boolean)`, indexes shift by one — the prelude gets labeled "Programa Regular" and the real program content gets labeled "Anuncio Publicitario".

**Fix in `TvFormattedAnalysisResult.tsx`:**
- Replace the brittle split/match with a single regex that walks the string and emits `{type, content}` pairs in the order they actually appear.
- If text appears **before** the first marker, render it in a neutral/preamble card (no Programa Regular / Anuncio label) so it's never misclassified.
- Add a small dev-only `console.warn` when the parser detects unlabeled prelude > 200 chars, so we can see if the model keeps doing this.

## Issue 2 — "Page refreshing while rendering"

What looks like a refresh is the resume effect in `src/hooks/tv/useTvVideoProcessor.ts` (lines 763–858) running on mount whenever `activeProcessingId` is set, even when the transcription is already on screen. Symptoms: `setIsProcessing(true)`, "Reanudando procesamiento" toast, `setAnalysisResults('')` clearing the persisted analysis, then refilling it a moment later.

**Fix:**
- In the resume effect, before doing anything destructive, check if `transcriptionText` is already populated for this `activeProcessingId`. If yes, skip the resume entirely and just clear `activeProcessingId` (we already hydrated from sessionStorage).
- In the "already completed" branch (lines 775–790), do **not** overwrite `analysisResults` with `''` when `full_analysis` is null — keep whatever's persisted; the analysis polling hook will fill it in.
- Same fix in the DB restore effect (lines 861–900): only set `analysisResults` when DB has a non-empty value, otherwise leave the persisted state alone.
- Suppress the "Reanudando procesamiento" toast when the row is already `completed` — it's misleading.

## Issue 3 — Analysis taking longer than before

Backend latency (`analyze-tv-stored`) is out of scope per your "no edge functions" rule. Frontend-side, we can shorten the time-to-display once the row lands:

**Fix in `src/hooks/tv/useTranscriptionPolling.ts`:**
- For the "completed but no full_analysis yet" case, use a faster initial cadence: 3s for the first 60s after completion, then back off to 8s. The `tv-analysis-ready` window event already short-circuits this when realtime fires — this just covers the case where realtime drops the update.

**Fix in `src/hooks/tv/useTvAnalysisDisplay.ts`:**
- Mirror the same accelerated cadence in the fallback poller (currently fixed at 8s).

No change to the user-facing "Generando análisis…" spinner — that already works.

## Files to edit

```text
src/components/tv/analysis/TvFormattedAnalysisResult.tsx   (parser rewrite)
src/hooks/tv/useTvVideoProcessor.ts                        (resume guard, no-clobber)
src/hooks/tv/useTranscriptionPolling.ts                    (faster early polling)
src/hooks/tv/useTvAnalysisDisplay.ts                       (faster fallback polling)
```

## Verification

After the build:
1. Reload `/tv` with the existing completed transcription → no toast, no spinner flash, no analysis flicker.
2. The same analysis text now renders with the program content in the blue card and only true ads in the yellow card. Prelude (if any) appears in a neutral header above.
3. Fresh upload → "Procesando video…" → transcription shows → "Generando análisis…" spinner → analysis renders correctly grouped within ~10s of the row being written.

I'll show the diffstat and the rendered cards (or a console excerpt confirming parser pairing) once implemented.
