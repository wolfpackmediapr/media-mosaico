

## Fix: Memory Limit on Retry + Redeploy Press PDF

### Root Cause

The 429 retry logic works, but during the 15-second backoff wait, the edge function holds ~222MB of video data in memory. Supabase Edge Functions have a ~150MB memory limit → **OOM kill before retry completes**.

The retry delay isn't the problem — the problem is that the video data stream has already been consumed and is buffered in memory by the time the 429 hits. The upload initialization (the part that gets 429'd) happens *before* the actual data upload, so we can retry the init without holding video data.

### Changes

#### 1. Restructure retry to avoid holding video data during backoff
**File:** `supabase/functions/process-tv-with-gemini/index.ts`

The upload init request (lines 244-257) is a lightweight JSON POST that doesn't send video data — it just gets the upload URL. The video stream is consumed later (lines 282-289). So the retry loop around the init is fine in isolation.

The real memory issue: the function downloads all 15 chunks from Supabase Storage into memory *before* calling `uploadVideoToGeminiStream`. Find where chunks are assembled and check if the full video is buffered.

**Investigation needed:** Check the chunk assembly code to see if all chunks are concatenated into a single buffer before streaming. If so, refactor to use a streaming approach that doesn't hold the full video.

**Quick fix (if streaming refactor is too large):** Remove the 15s/30s/60s delays from the retry loop. Instead, fail fast on 429 and let the *outer* retry mechanism (the caller) handle re-invocation. This avoids holding memory during backoff.

Alternatively, reduce backoff to 2s/4s/8s — short enough that the function doesn't get killed, but still gives Gemini time to cool down.

#### 2. Redeploy `process-press-pdf`
Trigger a fresh deploy. The code fixes (null guards + `publimediaClients`) are already in the codebase — it just needs the deploy to land.

### Investigation Step (before finalizing plan)

I need to check how chunks are assembled before the upload call to determine if the full video is buffered in memory. This will determine whether we need a streaming refactor or just shorter retry delays.

