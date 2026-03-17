

## Fix: TV Video Processing "File Not ACTIVE" Failure

### Root Cause Analysis

The edge function `process-tv-with-gemini` has **two bugs** causing the 346MB `.mov` file processing to fail:

1. **Premature file usage after timeout**: The `waitForFileProcessing` function only waits 15 attempts x 3 seconds = 45 seconds. For large files (~350MB), Gemini needs more time. When all 15 checks show `PROCESSING`, the function **silently returns** (line 327-328: "continuing with analysis...") instead of throwing. The file is then used immediately while still in `PROCESSING` state, causing the `400 FAILED_PRECONDITION: File is not in an ACTIVE state` error on both transcription and analysis calls.

2. **`transcriptionData` is not defined**: On line 771, the fallback extraction references `transcriptionData` which is declared *inside* the `try` block (line 737) but the fallback runs in the `catch` block where it's out of scope. This causes a `ReferenceError` and prevents any fallback recovery.

### Solution

#### Fix 1: Increase wait time and fail properly if file never becomes ACTIVE

In `waitForFileProcessing` (line 282):
- Increase `maxAttempts` from **15 to 60** (matching the architecture memory: "60-attempt wait time")
- **Throw an error** instead of silently returning when the file never reaches ACTIVE state
- This gives ~3 minutes for large files to finish processing on Gemini's side

#### Fix 2: Fix `transcriptionData` scoping bug

In the transcription retry loop (lines 665-788):
- Declare a `lastTranscriptionData` variable **outside** the loop (next to `speakerTranscription` at line 665)
- Assign it after each successful API response parse (after line 737)
- Reference `lastTranscriptionData` instead of `transcriptionData` in the fallback block (line 771)

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/process-tv-with-gemini/index.ts` | Fix `waitForFileProcessing` timeout (15 to 60 attempts) and throw on timeout instead of silently continuing; fix `transcriptionData` scoping bug in fallback extraction |

### Technical Details

```text
waitForFileProcessing (line 282-332):
  - maxAttempts: 15 -> 60
  - Remove silent return on line 327-328
  - Replace with: throw new Error('File processing timeout...')

Transcription loop (line 665-788):
  - Add: let lastTranscriptionData: any = null;  (after line 665)
  - Add: lastTranscriptionData = transcriptionData;  (after line 737)
  - Change line 771: transcriptionData -> lastTranscriptionData
  - Change line 772: transcriptionData -> lastTranscriptionData
```

