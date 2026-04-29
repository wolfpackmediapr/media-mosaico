# Fix TV Transcription Hanging + Disappearing Video

## Root Cause

`process-tv-with-qwen` runs transcription, speaker-id, AND a heavy Qwen analysis call (32k tokens) inside one background invocation. Edge Functions have a hard ~2s **CPU time** budget (separate from 150s wall clock). The streaming JSON parsing of the 32k-token analysis push the worker over the CPU cap → `ERROR: CPU Time exceeded`.

When the runtime kills the worker mid-execution, **the `finally` block never runs**, so jobs get frozen at `status: processing, progress: 55` instead of `failed`. The frontend treats them as "live" but no updates ever come, and the UI eventually drops the card → "video disappears."

Evidence in DB:
- Stuck jobs: `4f3ff24e` (55%), `fa98999e` (35%) → status still `processing`
- Even "completed" recent jobs have `analysis_summary = NULL` → analysis silently failed

## Strategy (Surgical — TV ONLY)

1. **Decouple analysis from transcription.** Once transcription text is saved, mark the job complete for the transcription portion, then **fire-and-forget invoke** the existing `analyze-tv-content` edge function (Gemini-based, different code path, fresh CPU budget).
2. **Strengthen terminal-state guarantees** so jobs never get stuck even if the worker dies.
3. **One-time recovery** for the 5 stuck/incomplete jobs.

**Zero changes to:** Prensa Escrita, Radio, Social, Dashboard, Auth, any shared component, `analyze-tv-content`, or any frontend code outside the TV processor hook.

## Changes

### 1. `supabase/functions/process-tv-with-qwen/index.ts` (TV only)

In `processChunkedInBackground`:

- After saving the transcription (line ~868), **stop doing analysis inline**. Replace the inline Qwen analysis block (lines ~880-931) with:
  - Save final transcription state (`status: 'completed'`, `progress: 100`, transcription text, speaker map) immediately.
  - Fire `supabaseClient.functions.invoke('analyze-tv-content', { body: { transcriptionId, transcriptionText, categories, clients } })` wrapped in `EdgeRuntime.waitUntil(...)` so it doesn't block return. Failures here only update `provider_fallback_reason` — the user already has the transcription.
- Add a **5-minute watchdog** at function start: any `processing` job for the same user older than 5 min is force-marked `failed:timeout` (catches previously-killed jobs).
- Keep existing `try/catch/finally` exactly as-is.

### 2. `src/hooks/tv/useTvVideoProcessor.ts` (TV only)

- After invoking `process-tv-with-qwen`, polling already exists. No change to polling logic.
- Treat `status === 'completed'` as success even if `analysis_summary` is still null (analysis arrives shortly after via the separate function and realtime subscription updates the UI).
- When `status` starts with `failed:`, surface the localized error and **do not remove the video card** — keep it visible with a "Retry analysis" affordance.

### 3. `src/components/tv/TvVideoUploader.tsx` / file-list display (TV only)

- When a job moves to `failed:*`, keep the file card visible (currently it disappears because the success/error branch removes it). Add a small inline error state with a retry button that re-invokes only the analysis step.

### 4. New helper: `analyze-tv-stored` edge function (small)

A thin wrapper that takes a `transcriptionId`, fetches the stored `transcription_text` + categories/clients from DB, then invokes `analyze-tv-content` with that payload. Used by:
- The retry button in the UI
- The one-time recovery script for stuck jobs

This avoids duplicating the analysis logic and keeps `analyze-tv-content` untouched.

### 5. One-time recovery (SQL + function calls)

For the 5 affected rows:
- `fa98999e`, `4f3ff24e` → reset to `transcribed`, then call `analyze-tv-stored` to backfill analysis (and finalize text if missing).
- `e674eb8c`, `90e55a41`, `65511dcb`, `983a9cb3`, `2a5d43d3`, `0e1d5422` (completed but no analysis) → call `analyze-tv-stored` to backfill analysis only.

Done via a one-shot edge function call per ID — no DB schema change.

## Technical Notes

- **Why not Gemini directly inline?** The CPU cap is hit in the streaming JSON loop, not the API call. Switching providers in the same invocation wouldn't fix it. Splitting invocations gives each stage its own 2s CPU budget.
- **Why fire-and-forget invoke vs. background queue?** `analyze-tv-content` already exists, takes <30s, and runs in its own isolate with a fresh CPU budget. No new table, no cron, minimal change.
- **Realtime updates**: `tv_transcriptions` row updates from `analyze-tv-content` propagate via the existing realtime channel — no frontend wiring needed.
- **No migrations required.** No new tables, no new columns (uses existing `analysis_*` columns).

## What Will NOT Change

- Prensa Escrita pipeline, hooks, UI — untouched
- Radio pipeline, hooks, UI — untouched
- Dashboard, Social, Auth, shared components — untouched
- `analyze-tv-content` edge function — untouched (just called from a new place)
- Database schema — untouched
- `useChunkedVideoUpload` hook — untouched (already fixed last turn)

## Acceptance Criteria

- New TV upload completes: transcription appears within ~3 min, analysis (5W, summary, keywords) appears within ~30s after.
- If analysis fails, transcription is still visible and a "Reintentar análisis" button appears on the card.
- No job ever stays in `processing` state for more than 5 min — watchdog forces a terminal status.
- The 5 stuck/incomplete historical jobs are recovered with full analysis.
