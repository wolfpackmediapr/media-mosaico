

## Plan: Deploy Already-Implemented Changes

### Current State
Both files already contain all the approved changes:
- **`src/hooks/tv/useTvVideoProcessor.ts`** (lines 168-172): Passes `chunked:${sessionId}` for manifest-based uploads instead of attempting client-side reassembly
- **`src/hooks/tv/useTvVideoProcessor.ts`** (lines 404-415): Handles `MANIFEST_NOT_SUPPORTED` 422 response with Spanish toast message
- **`supabase/functions/process-tv-with-qwen/index.ts`** (lines 214-236): Detects `chunked:` prefix, updates transcription to `failed:manifest_not_supported`, returns 422

### Only Action Needed
**Redeploy** the `process-tv-with-qwen` edge function — it currently has zero logs, indicating the latest code was never deployed.

### No Code Changes Required
- No modifications to any files
- No radio, press, UI, or site-wide changes
- Just a deployment of the existing edge function code

### Expected Behavior After Deployment
1. Large manifest-based video → frontend sends `chunked:${sessionId}` to Qwen
2. Qwen detects `chunked:` prefix → returns 422 with `MANIFEST_NOT_SUPPORTED`
3. Frontend shows toast: "Video demasiado grande para análisis AI" with explanation that playback works
4. Transcription record updated to `failed:manifest_not_supported`
5. No infinite polling, no 500 errors

