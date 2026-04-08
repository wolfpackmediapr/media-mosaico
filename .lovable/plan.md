

## Fix: Qwen Function for Chunked/Manifest Video Uploads

### Root Cause (confirmed with DB evidence)

All recent uploads are **manifest-based chunked uploads** (~350MB files):
- `assembled_file_path = NULL`
- `playback_type = 'chunked'`
- `manifest_created = true`
- Chunks stored at `chunks/{sessionId}/chunk_XXXX` in `video` bucket (24 chunks × 15MB)
- No single assembled file exists in storage

The Qwen function tries to sign a non-existent single file path → 500.

The `reassemble-chunked-video` edge function **rejects files >50MB** (line 82), so it cannot help here.

### Key constraint

Qwen API requires a **single video URL**. Edge functions have ~150MB memory. These files are ~350MB. Edge-function-based reassembly is not possible for these files.

### Solution: Frontend-side reassembly before Qwen call

The frontend already has access to the chunk manifest. It should reassemble the file into a single storage object **before** invoking the Qwen function. This happens client-side where there are no memory constraints.

### Implementation

#### File 1: `src/hooks/tv/useTvVideoProcessor.ts`

**When a chunked session has `playback_type = 'chunked'` and no `assembled_file_path`:**

1. Add `playback_type, manifest_created` to the chunked session select query
2. Before calling Qwen, detect manifest-based sessions
3. Download each chunk from storage using signed URLs, concatenate into a Blob
4. Upload the assembled Blob to `video/{sessionId}/{basename}` 
5. Update `assembled_file_path` in DB so this only happens once
6. Pass the assembled path to Qwen

This is a one-time cost per video — subsequent processing uses the cached assembled file.

#### File 2: `supabase/functions/process-tv-with-qwen/index.ts`

1. Remove the broken reassembly fallback (lines 223-283) — the frontend now handles this
2. Keep simple: if signed URL fails, return a clear error with the path that failed
3. Add detailed logging of incoming `videoPath` for debugging

### Changes summary

| File | Change |
|------|--------|
| `src/hooks/tv/useTvVideoProcessor.ts` | Add client-side chunk reassembly before Qwen call |
| `supabase/functions/process-tv-with-qwen/index.ts` | Remove broken reassembly, improve error messages |

### What stays the same
- No radio, press, or UI changes
- No DB migration needed
- `reassemble-chunked-video` untouched
- `process-tv-with-gemini` untouched
- Chunk upload flow untouched

### Risk note
Client-side reassembly of 350MB files requires the user to keep the browser tab open during download+reupload (~2-4 min on fast connection). Progress feedback will be shown. The assembled file is cached in storage so it only happens once per video.

