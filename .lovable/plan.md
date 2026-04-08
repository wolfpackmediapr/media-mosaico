

## Diagnosis: TV Processing Stuck at 60% — Edge Function Silent Crash

### What happened

The DB record `02ab7512-f00b-4766-8617-3a79082002f1` is stuck at:
- `status: "Generating content analysis..."` 
- `progress: 60`
- `updated_at: 18:27:45` (last write ~11 min after creation, then no more updates)

The edge function (`process-tv-with-gemini`) successfully completed Stage 1 (transcription at 40%), set progress to 60 for Stage 2 (analysis), then **silently crashed or timed out** during the Gemini analysis API call. The `EdgeRuntime.waitUntil` background processing died without ever updating the DB to `completed` or `failed`.

### Why the frontend loops forever

The polling loop checks only for `status === 'completed'` or `status.startsWith('failed')`. Since the DB status is `"Generating content analysis..."` (a progress message, not a terminal state), the poll runs indefinitely. The `maxAttempts = 360` limit (30 min at 5s intervals) would eventually trigger a timeout, but the user is watching it loop for 15+ minutes before that.

### Root cause

The edge function's background processor crashed (likely Gemini API timeout, 429 exhaustion, or OOM during the analysis call) and the `catch` block in `processVideoInBackground` either wasn't reached or failed to write the `failed` status to the DB.

### Two problems to fix

**Problem 1: No stale-job detection in the frontend**
The polling loop has no concept of "the DB hasn't been updated in X minutes, the backend must be dead." It trusts the backend to always write a terminal status.

**Problem 2: The edge function error handler may silently fail**
If `processVideoInBackground` crashes in a way that prevents the catch block from executing (e.g., Deno worker killed due to memory/time limit), the DB is never updated.

### Plan

**File 1: `src/hooks/tv/useTvVideoProcessor.ts`** — Add stale-job detection to polling

In `pollForProcessingCompletion`, track the last time `progress` or `status` changed. If unchanged for 5 minutes (300 seconds), treat the job as failed with a clear message instead of polling forever.

```text
Poll loop:
  → Read status, progress from DB
  → If status unchanged AND progress unchanged for 5 minutes:
      → Update DB status to 'failed:stale'
      → Throw error: "El procesamiento dejó de responder. Intenta de nuevo."
  → Existing completed/failed checks (unchanged)
```

**File 2: `supabase/functions/process-tv-with-gemini/index.ts`** — Add defensive DB write before analysis call

Before the analysis Gemini API call, set a "heartbeat" timestamp. After the call, if the catch block fires, ensure the DB is always written to with `failed` status. Add a secondary try/catch around the error handler itself to guarantee the DB update.

The error handler at line ~2583 already exists but may not execute if the Deno runtime kills the worker. The fix is to also add a `finally` block that checks if status was set to `completed` — if not, force `failed`.

### Changes summary

| File | Change | Lines affected |
|------|--------|---------------|
| `src/hooks/tv/useTvVideoProcessor.ts` | Add stale-job timeout (5 min unchanged = fail) | ~506-590 |
| `supabase/functions/process-tv-with-gemini/index.ts` | Add `finally` block to guarantee terminal DB status | ~2530-2625 |

### What this does NOT change
- No changes to the Gemini API calls, prompts, or retry logic
- No changes to radio, press, or Qwen function
- No changes to the key rotation system

