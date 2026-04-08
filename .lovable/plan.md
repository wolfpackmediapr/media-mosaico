

## Switch Frontend to Call Qwen Instead of Gemini

### Problem
The frontend (`useTvVideoProcessor.ts` and `useTvAnalysis.ts`) still calls `process-tv-with-gemini`, which keeps hitting Gemini rate limits and content blocks. The `process-tv-with-qwen` function is deployed and ready but never called.

### Key compatibility detail
The Qwen function runs synchronously and returns `{ success, transcription, analysis }`. The frontend already has a sync response handler (lines 428-446 in `useTvVideoProcessor.ts`) that processes this exact shape — so the switch is a direct string replacement with minor field mapping.

The Qwen function also writes `status: 'completed'` and all analysis fields to `tv_transcriptions`, so the DB state will be consistent.

### One difference to handle
The Qwen function returns `analysis` (parsed JSON object), while the frontend expects `full_analysis` (string). Need to map this in the response handling or adjust the field name check.

### Changes

**File 1: `src/hooks/tv/useTvVideoProcessor.ts`**
- Line 334: Change `'process-tv-with-gemini'` → `'process-tv-with-qwen'`
- Line ~439: Add `result.analysis` as a fallback for `result.full_analysis` since Qwen returns `analysis` not `full_analysis`

**File 2: `src/hooks/tv/useTvAnalysis.ts`**
- Line 106: Change `'process-tv-with-gemini'` → `'process-tv-with-qwen'`

Two files, three line changes total. No other files modified.

### What stays the same
- All polling logic, stale-job detection, error handling
- The Gemini function remains deployed (can switch back if needed)
- Radio, press, and all other modules untouched
- Database schema unchanged

### After deployment
The next video upload will go through Qwen instead of Gemini, bypassing the rate limit and content blocking issues entirely.

