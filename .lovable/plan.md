## Problem

`useTvAnalysisDisplay` fetches `full_analysis` once when `transcriptionId` (or `forceRefresh`) changes. After Commit A decoupled analysis, `process-tv-with-qwen` writes `status='completed'` immediately and `analyze-tv-stored` writes `full_analysis` 1–3 minutes later. The initial fetch sees NULL; nothing ever re-runs it. UI stays on "El análisis se mostrará automáticamente…" even though the row in DB now has the analysis (verified: row `4034ea5b…` has `analysis_len=18666`, `status=completed`).

`useTranscriptionPolling` already polls every 8s post-completion and selects `full_analysis`, but it has no listener that nudges the display hook.

## Constraint discovered

The user's proposed fix — `queryClient.invalidateQueries({ queryKey: ['tv-analysis', transcriptionId] })` — would be a no-op. `useTvAnalysisDisplay` is plain `useState` + `useEffect`, not React Query. There is no `['tv-analysis', id]` query key in the codebase.

## Fix (scope: 1 file)

**File:** `src/hooks/tv/useTranscriptionPolling.ts`

Inside the existing `useQuery.queryFn`, after a successful fetch, when `data.status === 'completed'` and `data.full_analysis` is non-null, dispatch a window event:

```ts
window.dispatchEvent(new CustomEvent('tv-analysis-ready', {
  detail: { transcriptionId: data.id, full_analysis: data.full_analysis }
}));
```

Use a ref to ensure we only fire once per transcription id (prevents repeated dispatches once polling stops on subsequent invalidations).

## Companion fix (scope: 1 file)

**File:** `src/hooks/tv/useTvAnalysisDisplay.ts`

Add a `useEffect` that listens for `tv-analysis-ready`:
- If `event.detail.transcriptionId === transcriptionId`, call `fetchExistingAnalysis()` (or set `existingAnalysis` directly from `event.detail.full_analysis` to skip the round-trip).

This is the minimal coupling that doesn't restructure either hook into React Query.

## Why a window event vs. invalidateQueries

`useTvAnalysisDisplay` lives in a different subtree than the polling hook and uses local state. A custom event is the smallest change that crosses the boundary without rewriting the display hook to use React Query (which would be a larger refactor and risks regressions in `TvAnalysis.tsx`'s priority logic `analysisResults || existingAnalysis`).

If you'd prefer the larger refactor — convert `useTvAnalysisDisplay` to `useQuery` with key `['tv-analysis', transcriptionId]` and use `invalidateQueries` from the polling hook — say so and I'll do that instead. It's still 2 files but cleaner long-term.

## Diffstat (expected)

```text
src/hooks/tv/useTranscriptionPolling.ts  | ~12 +++
src/hooks/tv/useTvAnalysisDisplay.ts     | ~15 +++
2 files changed, ~27 insertions(+)
```

## Out of scope

- `process-tv-with-qwen` (untouched, per gate)
- `extract-tv-frames` trace (no recent invocations found in logs/codebase — likely already dead)
- One-time recovery of historical NULL rows (last 10 rows all have `analysis_len > 17k`, so no backfill needed right now)

## Verification after build

1. Upload a new TV video.
2. Watch console for `[useTranscriptionPolling] Status: completed Progress: 100` followed shortly by `tv-analysis-ready` dispatch.
3. Confirm "Análisis de Contenido TV" card switches from placeholder to rendered analysis without page reload.

Approve to proceed, or pick the React Query refactor variant.