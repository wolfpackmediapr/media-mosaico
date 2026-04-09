

## Root Cause: Memory Limit Exceeded (OOM)

The logs are definitive:

```
Downloaded chunk 10/24 (150.0MB total)
ERROR Memory limit exceeded
```

The `process-tv-with-qwen` edge function downloads all 24 chunks (350MB) into memory before uploading to AssemblyAI. Supabase Edge Functions have a ~150MB memory limit. It OOMs at chunk 10 every time. This is not an API key issue or a wrong function being called — the architecture itself cannot work inside an edge function's memory constraints.

Additionally, the Qwen function's prompts are simplified compared to the Gemini function's rich master prompt (`constructTvPrompt` + `buildTranscriptionOnlyPrompt` with visual speaker identification, lower-third reading, etc.). Those need to be preserved.

## Fix Plan

### 1. Replace in-memory buffering with `EdgeRuntime.waitUntil()` + streaming approach

The edge function cannot hold 350MB in memory. Two changes:

**a) Return immediately, process in background:**
- Use `EdgeRuntime.waitUntil()` to start background processing
- Return a `202 Accepted` with the transcription ID immediately
- The frontend already handles `result?.status === 'processing'` and polls — this path exists but is never triggered

**b) Stream chunks to AssemblyAI without buffering all at once:**
- Instead of downloading all chunks then uploading, create a `ReadableStream` that fetches chunks one-by-one and yields their bytes
- Pass this stream as the body to AssemblyAI's upload endpoint
- Peak memory: ~15MB (one chunk) instead of ~350MB (all chunks)

### 2. Preserve the master prompt from Gemini function

The Gemini function has a comprehensive prompt system that the Qwen function lacks:

- `buildTranscriptionOnlyPrompt()` — detailed speaker identification using visual cues (lower thirds, chyrons, recognizing PR news personalities), strict word-for-word transcription rules, `SPEAKER X (Name - Role):` format
- `constructTvPrompt()` — full 5W analysis with Spanish-only JSON field names, client relevance scoring, impact scoring, alerts

Copy these exact prompts into the Qwen function, replacing the current simplified versions. The analysis prompt structure matches (same JSON schema), but the transcription prompt is much weaker in Qwen — it lacks visual identification instructions, the PR-specific context, and the strict formatting rules.

### 3. Fix the streaming upload to AssemblyAI

Replace `transcribeViaAssemblyAI`:

```text
Current (broken):
  for each chunk: download into array → OOM at chunk 10
  concatenate all → upload blob

New (streaming):
  Create ReadableStream that:
    for each chunk index 0..N:
      download chunk (15MB)
      enqueue bytes to stream
      chunk gets GC'd before next download
  POST stream body to AssemblyAI /v2/upload
  Content-Length = total file size (known from session)
```

This keeps peak memory at ~15-30MB instead of 350MB.

### 4. No radio/UI/site-wide changes

Files to modify:
| File | Change |
|------|--------|
| `supabase/functions/process-tv-with-qwen/index.ts` | Stream chunks to AssemblyAI instead of buffering; use `EdgeRuntime.waitUntil()` for background processing; copy master prompts from Gemini function |

Files NOT touched:
- `src/hooks/tv/useTvVideoProcessor.ts` — already handles `status: 'processing'` + polling
- All radio, press, UI, navigation code
- `process-tv-with-gemini` — unchanged
- No DB migration needed

### 5. Implementation details

**Streaming upload function:**
```typescript
async function streamChunksToAssemblyAI(supabaseClient, sessionId, totalChunks, totalBytes, assemblyAiKey) {
  const stream = new ReadableStream({
    async pull(controller) {
      // download one chunk at a time, enqueue, move to next
      // close when all chunks sent
    }
  });

  const response = await fetch(ASSEMBLYAI_UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Authorization': assemblyAiKey,
      'Content-Type': 'application/octet-stream',
      'Content-Length': totalBytes.toString(),
    },
    body: stream,
  });
  return (await response.json()).upload_url;
}
```

**Background processing pattern:**
```typescript
serve(async (req) => {
  // validate, auth, parse request
  // create/update transcription record to 'processing'
  
  if (isChunked) {
    // Return immediately, process in background
    EdgeRuntime.waitUntil(processChunkedInBackground(/* params */));
    return new Response(JSON.stringify({ status: 'processing', transcriptionId }), {
      status: 202, headers: corsHeaders
    });
  }
  
  // Small files: process synchronously as before
});
```

### Validation

1. Upload 300MB+ TV file
2. Confirm function returns 202 immediately (no timeout)
3. Confirm chunks stream to AssemblyAI without OOM
4. Confirm AssemblyAI transcription completes with speaker labels
5. Confirm Qwen text analysis uses the full master prompt
6. Confirm `tv_transcriptions` is populated with completed status
7. Confirm frontend polling picks up the results
8. Confirm small files still work synchronously
9. Confirm radio and non-TV pages unchanged

