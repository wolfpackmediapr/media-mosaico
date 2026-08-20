# Transcription reliability fix (Radio + TV)

## What the logs actually show

There is **no AssemblyAI or Gemini outage**. Verified today:

- AssemblyAI accepted and completed every radio job it received (15:14, 15:16, 15:18 UTC), and rows landed in `radio_transcriptions`.
- TV, last 24h: 90 completed, 2 `failed:timeout`, 2 `failed:stale`, 11 still stuck at `uploaded`.
- TV, last 7 days: 510 completed, 11 `failed:stale`, 4 `failed:timeout`, 4 `failed:assemblyai_error`, 90 left at `uploaded`.

That pattern matches what you describe: intermittent, different users, different symptoms — not an outage. The failures are structural, in how the platform runs the job.

## Confirmed root causes

1. **Radio runs the whole job inside one HTTP request.** `transcribe-audio` loads the full audio into memory, uploads it, then polls AssemblyAI up to 60 times x 3s = up to 180 seconds while the browser waits. Edge functions cut the request off well before that. Long files intermittently die mid-poll, and the user sees a spinner forever, an error, or nothing — depending on where it died.
2. **Radio has no job record.** The row is only written after success. If the request dies, nothing is persisted, there is nothing to retry, and no way to tell "still running" from "dead".
3. **A DB insert failure is swallowed.** The insert error is logged and ignored ("continuing anyway"), so the UI can report success while nothing was saved. One row today saved with 0 characters.
4. **TV leaves orphans.** 11 rows sit at `uploaded` with no terminal status, plus `failed:stale` / `failed:timeout` — the background task is not always writing a final state, so the UI waits forever.
5. **Speaker data fetch is unguarded.** `fetch-utterances` has no successful invocations today (only shutdowns); when it fails the transcript can render with no speaker text.

## The fix

**Phase 1 — Radio: make it a tracked job (highest impact)**
- Insert the `radio_transcriptions` row up front with `status = 'processing'` and return the row id immediately, instead of holding the request open.
- Move the AssemblyAI upload + polling into a background task with a `finally` block that always writes a terminal status (`completed`, or `failed` with the error text).
- Frontend subscribes to that row and shows real progress, an actionable error, and a Retry button.

**Phase 2 — Stop silent data loss**
- Treat the DB insert error as a hard failure instead of continuing anyway.
- Reject a `completed` result whose text is empty and mark it `failed:empty_transcript` so it can be retried rather than saved blank.

**Phase 3 — TV orphan cleanup**
- Audit `process-tv-with-gemini` so every exit path writes a terminal status.
- Add a sweeper that flips rows stuck at `uploaded` past a threshold to `failed:stale` so the UI stops hanging.
- Backfill the currently stuck rows.

**Phase 4 — Speaker data and visibility**
- Make the utterances fetch non-fatal: on failure fall back to plain formatted text instead of an empty view.
- Surface the failure reason in the UI in Spanish so users report "timeout" rather than "it didn't work".

## Technical notes

- Files touched: `supabase/functions/transcribe-audio/index.ts`, `supabase/functions/process-tv-with-gemini/index.ts`, `src/hooks/useAudioTranscription.ts`, `src/hooks/radio/editor/useFetchUtterances.ts`, plus the radio processing UI components.
- Migration: add `status`, `progress`, `error_message` to `radio_transcriptions` if absent; enable Realtime on the table for live progress.
- No auth, RLS, permission, or client/taxonomy logic changes.
- Background work uses `EdgeRuntime.waitUntil` with a `finally` terminal-status write, per existing project convention.

## Verification

- Upload a long radio file (>15 min) and confirm the row goes `processing -> completed` without the browser holding the request.
- Force a failure (bad audio) and confirm a terminal `failed` status with a readable message plus a working Retry.
- Confirm no TV row remains at `uploaded` beyond the sweeper threshold.