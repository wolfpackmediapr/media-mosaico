

## Fix: `geminiApiKey is not defined` Runtime Error

### Root Cause

The dual key rotation refactor removed the local `geminiApiKey` variable declarations from `uploadVideoToGemini()` and `uploadVideoToGeminiStream()`, but left 2 references to it when calling `waitForFileProcessing()`:

- **Line 237**: `await waitForFileProcessing(uploadResult.file.name, geminiApiKey);`
- **Line 339**: `await waitForFileProcessing(uploadResult.file.name, geminiApiKey);`

Both throw `ReferenceError: geminiApiKey is not defined` at runtime, which is exactly what the edge function logs show.

### Fix

**File: `supabase/functions/process-tv-with-gemini/index.ts`**

Replace both occurrences:

```typescript
// Line 237 — inside uploadVideoToGemini()
await waitForFileProcessing(uploadResult.file.name, getApiKey());

// Line 339 — inside uploadVideoToGeminiStream()
await waitForFileProcessing(uploadResult.file.name, getApiKey());
```

Two lines changed. Then redeploy the edge function.

### Verification

After deploy, the edge function logs should show successful file upload and processing instead of the `geminiApiKey is not defined` error.

