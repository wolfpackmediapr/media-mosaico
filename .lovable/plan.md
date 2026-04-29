## What's happening

Per memory (`mem://features/tv/video-processing-architecture`), the TV upload pipeline is correct and unchanged: 15MB chunks, 3 parallel, manifest path for >50MB. Recent DB sessions confirm uploads ARE completing (15/15, 17/17, 19/19 today).

The real issue is **UX feedback**, not the pipeline:

1. **Progress feels frozen** — `chunkProgress` updates only once per batch of 3 chunks (line 221), and `uploadProgress` only updates after the batch finishes (line 235). With 15MB × 3 = 45MB per batch on slow uplinks, the bar can sit still for 30–90 seconds per tick.
2. **No byte-level counter** — UI shows only a percentage and "fragmento N/M". No MB uploaded / MB total, no speed, no ETA.
3. **No heartbeat after 100%** — once chunks finish, manifest creation / edge assembly runs silently and the bar stays at 100% with static text.
4. **Stale `in_progress` sessions** — when the user picks a new file mid-upload, old sessions are abandoned in `chunked_upload_sessions` (visible in DB: 0/15, 3/24, 12/19). They don't break anything but clutter and may confuse future resume attempts.

No backend, no edge function, no Qwen/AssemblyAI/analysis code is touched. Radio and Prensa Escrita are not touched.

## Plan

### 1. Per-chunk progress (the main fix)
In `src/hooks/use-chunked-video-upload.ts`:
- Replace the batch-level `setChunkProgress` with per-chunk increments. Track a `completedChunks` counter that each `uploadSingleChunk` increments on success, and update `chunkProgress` + `uploadProgress` from it inside the success path.
- Add `bytesUploaded` state, incremented by chunk size on each chunk completion.
- Add `uploadSpeed` (bytes/sec, rolling 5s window) and `etaSeconds` derived from speed.

### 2. Richer counter UI
In `src/components/tv/TvVideoUploader.tsx`, expand `getProgressText()` to show:
```
Subiendo fragmento 7/19 · 102 MB / 285 MB · 4.2 MB/s · ETA 0:43
```
Keep the existing Pause/Resume/Cancel buttons and Progress bar untouched.

### 3. Post-100% heartbeat
After all chunks upload, switch to an indeterminate state with rotating status messages so the user knows work continues:
- "Creando manifiesto…" (large file path) — already logged but not surfaced
- "Ensamblando en el servidor…" (small file path)
- A pulsing dot or animated bar (use existing `Progress` with `value={undefined}` styling or a simple spinner already in the codebase).

### 4. Cleanup of stale sessions (low risk)
When `uploadFileChunked` starts a new upload while an old session ref exists and is not paused, mark the old session row `status = 'cancelled'` in `chunked_upload_sessions`. Pure DB hygiene, no behavior change for working uploads.

### 5. Safety
- All changes are additive to existing state; no rename of existing exports.
- No edge function changes, no DB schema changes, no migrations.
- Radio (`useFileUpload`) untouched. Prensa Escrita untouched.
- Speaker ID / transcription / analysis pipeline untouched.

## Files changed

- `src/hooks/use-chunked-video-upload.ts` — per-chunk progress, speed/ETA state, stale-session cancel
- `src/components/tv/TvVideoUploader.tsx` — extended progress text + post-100% heartbeat UI

## Out of scope

- Speaker diarization / Qwen / AssemblyAI prompts (separate work, not regressed)
- Manifest vs assembled playback logic
- Any UI changes outside the TV upload card
