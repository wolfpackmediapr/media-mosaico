
## Fix: Stop Rejecting Large TV Files and Restore Full Qwen Processing

### What is actually happening
This is not a random bug anymore — the current TV flow is explicitly blocking large files.

Three places now force that outcome:
1. `src/hooks/tv/useTvVideoProcessor.ts` short-circuits any `chunked:` video before Qwen is called and shows the “Video demasiado grande” toast.
2. `supabase/functions/process-tv-with-qwen/index.ts` also hard-rejects `chunked:` paths with `MANIFEST_NOT_SUPPORTED`.
3. `supabase/functions/reassemble-chunked-video/index.ts` cannot currently help for manifest uploads because it exits early on `status === 'completed'`, but manifest uploads are already marked `completed` right after chunk upload finishes.

So the system is currently designed to play big files, but not analyze them. That is the part to reverse.

## Implementation plan

### 1) Restore the TV processing flow for large files
Update `src/hooks/tv/useTvVideoProcessor.ts` so large manifest uploads are no longer treated as terminal failures.

Changes:
- Remove the current fail-fast branch that stops processing when `fileName.startsWith('chunked:')`.
- Replace it with automatic reassembly orchestration:
  - if the matched chunk session already has `assembled_file_path`, use it immediately
  - if not, call `reassemble-chunked-video`
  - wait for the assembled path, then call `process-tv-with-qwen` with the real assembled storage path
- Keep existing polling, stale-job protection, toasts for normal progress, and existing TV component behavior unchanged.

Result:
- big files still upload/play via chunk manifest first
- analysis flow automatically converts them into a single cached file only when needed
- Qwen receives a real file path instead of a rejected `chunked:` placeholder

### 2) Fix reassembly so it works for manifest uploads
Update `supabase/functions/reassemble-chunked-video/index.ts` to support the large-file flow correctly.

Changes:
- Do not return early just because the session `status` is `completed`
- Instead, only short-circuit if `assembled_file_path` already exists
- Read `assembled_file_path`, `file_name`, `playback_type`, and manifest/session data before deciding whether reassembly is needed
- Normalize the final file name to a basename before building the output path so malformed nested paths cannot happen again
- Store a canonical assembled path, then persist it back to `chunked_upload_sessions.assembled_file_path`

Result:
- manifest sessions can be assembled after upload
- repeated analyses reuse the cached assembled file
- path duplication issues are prevented at the source

### 3) Raise storage limit so assembled large files can actually exist
Add a migration to increase the `video` bucket file size limit.

Why this is required:
- even perfect code will still fail if Supabase rejects the assembled 300–500MB object
- this is the real infrastructure blocker behind the earlier 500s during re-upload/reassembly attempts

Recommended scope:
- raise `video` bucket limit high enough for your real TV files, with headroom (for example 1GB)

### 4) Make Qwen accept the assembled large-file path instead of rejecting the workflow
Update `supabase/functions/process-tv-with-qwen/index.ts`.

Changes:
- remove the current hard 422 rejection for `chunked:`
- replace it with TV-safe handling:
  - if a chunked reference somehow still reaches the function, look up the session
  - if `assembled_file_path` exists, switch to that path and continue
  - if it does not exist yet, return a structured reassembly-needed response instead of a terminal “not supported” failure
- keep the existing transcription + analysis logic unchanged once a real assembled path is available

Result:
- Qwen becomes compatible with large-file workflow
- frontend and backend both support the same recovery path
- no more intentional “too large for AI” dead-end for chunked TV uploads

### 5) Normalize transcription records for chunked uploads
Clean up the TV transcription path handling in `src/hooks/tv/useTvVideoProcessor.ts`.

Changes:
- use one canonical chunked reference format everywhere: `chunked:${sessionId}`
- avoid mixing:
  - `chunked:${sessionId}`
  - `chunked:${sessionId}/${fileName}`
- keep `assembled_file_path` only in `chunked_upload_sessions` as the cache source of truth

Result:
- existing transcription lookups become reliable
- fewer duplicate records
- easier retry/recovery behavior

## Technical details
Files to change:
- `src/hooks/tv/useTvVideoProcessor.ts`
- `supabase/functions/reassemble-chunked-video/index.ts`
- `supabase/functions/process-tv-with-qwen/index.ts`
- new Supabase migration for `storage.buckets.file_size_limit`

Key design choice:
- keep playback manifest-based
- assemble only for AI processing
- cache the assembled file so Qwen does not need a fresh rebuild every time

What will not change:
- no radio code
- no shared UI/site-wide layout changes
- no tab/navigation behavior changes
- no changes to the TV playback components beyond preserving current behavior

## Validation
After implementation, verify this exact flow:
1. Upload a 300MB+ TV file
2. Confirm chunked playback still works immediately
3. Start processing and confirm the system auto-reassembles in the background
4. Confirm `assembled_file_path` is populated
5. Confirm Qwen runs on the assembled file and writes transcription/analysis
6. Confirm a second run reuses the cached assembled file instead of rebuilding it
7. Confirm small TV files still process normally
8. Confirm radio and non-TV pages behave exactly the same
