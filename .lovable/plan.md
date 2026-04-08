

## Fix: Deploy Qwen Function + Fix Parameter Mismatch

### Root Cause

Two issues preventing the Qwen function from working:

1. **Function not deployed** — The `process-tv-with-qwen` edge function has zero logs, meaning it was never deployed to Supabase. The config.toml entry alone doesn't deploy it.

2. **Parameter name mismatch** — The frontend sends `transcriptionId` but the Qwen function destructures `transcriptId`:
   - Frontend (line 337): `transcriptionId: actualTranscriptionId`
   - Qwen function (line 199): `const { videoPath, transcriptId, ... } = body;`
   
   This means `transcriptId` is always `undefined`, so the function never updates the DB record and the frontend can't track progress.

### Changes

**File: `supabase/functions/process-tv-with-qwen/index.ts`** — Accept both parameter names

Line 199: Change destructuring to accept `transcriptionId` and fall back:
```typescript
const { videoPath, transcriptionId, transcriptId: transcriptIdAlt, categories = [], clients = [] } = body;
const transcriptId = transcriptionId || transcriptIdAlt;
```

This is a 1-line change that makes the function compatible with both the frontend's `transcriptionId` and the original curl-style `transcriptId`.

**Deployment**: Deploy `process-tv-with-qwen` edge function after the fix.

### What stays the same
- No changes to any other files
- Gemini function untouched
- Radio, press modules untouched

