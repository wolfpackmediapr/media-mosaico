
## What the logs show

1. The failure is happening before Qwen runs.
   - `reassemble-chunked-video` downloads all 24 chunks successfully (`Streaming complete: 346MB in 23s`)
   - then fails on the final Supabase Storage upload:
     `Failed to upload final file: The object exceeded the maximum allowed size`

2. The database confirms the loop:
   - latest `chunked_upload_sessions` for this file have `playback_type = 'chunked'`, `manifest_created = true`, `uploaded_chunks = total_chunks`, but `assembled_file_path = NULL`
   - latest `tv_transcriptions` are failing after reassembly attempts, with no provider recorded, meaning Qwen never got control

3. The `video` bucket row does show `file_size_limit = 1GB`, but Supabase docs say the effective limit is the minimum of:
   - global storage limit
   - bucket limit
   - plan cap  
   So changing `storage.buckets.file_size_limit` alone does not guarantee large uploads will work. That is why 346MB is still being rejected.

4. `QWEN_API_KEY` is configured. It is not the current blocker.
   - The current blocker is the assembled-file upload back into Supabase.
   - Qwen is never reached in the failing runs.

## Research conclusion

- Supabase: bucket file limits are not the only limit. Global Storage Settings still apply, and Free plans cap uploads at 50MB.
- Qwen/DashScope: Qwen Omni uses an OpenAI-compatible API and supports public URL-based media inputs. That means we do not need to create one giant assembled file in Supabase just to process a large TV upload.

## Fix plan

### 1) Stop using Supabase reassembly as the required path for large TV AI jobs
Update the TV/Qwen flow so manifest-based chunked videos do **not** call `reassemble-chunked-video` before analysis.

New rule:
- small/assembled file: keep current direct path
- manifest chunked file: process from chunk metadata directly

This breaks the loop immediately because the failing 346MB re-upload is removed from the critical path.

### 2) Add a chunk-aware Qwen path in `process-tv-with-qwen`
Update `supabase/functions/process-tv-with-qwen/index.ts` so `videoPath = chunked:{sessionId}` becomes a first-class supported input.

Implementation approach:
- look up `video_chunk_manifests` and `chunked_upload_sessions`
- generate signed URLs for the ordered chunk files in `video` bucket
- send those chunk URLs to Qwen in documented multimodal URL mode
- instruct Qwen to treat the ordered chunks as one continuous broadcast

Important:
- keep the existing single-file path for already-assembled/smaller videos
- add a separate chunked branch so we do not risk radio/UI/site-wide behavior

### 3) Update `useTvVideoProcessor.ts` orchestration
Change the frontend TV flow so when a large upload is manifest-based:
- it passes the canonical `chunked:${sessionId}`
- it does **not** invoke `reassemble-chunked-video`
- it starts Qwen processing directly

Keep the existing UI behavior:
- same TV page
- same tab/layout
- same playback behavior
- same polling flow

Only the backend target path changes.

### 4) Improve failure/status handling so the app stops looping
Tighten the TV failure states:
- return/store explicit statuses like:
  - `failed:supabase_storage_limit`
  - `failed:qwen_chunk_input`
  - `failed:qwen_rate_limit`
  - `failed:runtime`
- preserve backend failure reasons in `provider_fallback_reason`
- prevent the frontend catch block from overwriting a specific backend failure with generic `failed`

This makes the next error diagnosable instead of sending us back into the same loop.

### 5) Re-scope `reassemble-chunked-video`
Do not remove it globally, but stop depending on it for large TV AI analysis.

Keep it only for cases where a real assembled object is still useful:
- medium files
- optional cache path
- manual recovery/admin use

Also improve its error reporting so if it is used again, it writes a precise cause instead of only `failed`.

### 6) Optional infrastructure follow-up
If you still want assembled 300MB+ objects stored in Supabase for other workflows, that is a separate infrastructure task:
- check Supabase **Storage Settings → Global file size limit**
- confirm the project plan supports the target size  
This cannot be solved reliably by SQL on `storage.buckets` alone.

## Technical details

Files to update:
- `src/hooks/tv/useTvVideoProcessor.ts`
- `supabase/functions/process-tv-with-qwen/index.ts`
- optionally `supabase/functions/reassemble-chunked-video/index.ts` for clearer status/error reporting

Files not targeted:
- radio code
- shared UI/site-wide layout
- tabs/navigation
- non-TV modules

Key design change:
```text
Current broken path:
chunks -> reassemble in edge function -> upload 346MB object to Supabase -> fail -> Qwen never runs

New path:
chunks + manifest -> signed chunk URLs -> Qwen chunk-aware processing -> transcription/analysis saved
```

## Why this is the right fix

- It fixes the actual blocker shown in logs.
- It stops depending on a storage upload that Supabase is rejecting.
- It uses the chunked data you already have instead of duplicating it.
- It keeps the rest of the site isolated.
- It makes Qwen the processor for large files instead of blocking it.

## Validation after implementation

1. Upload a 300MB+ TV file
2. Confirm playback still works immediately from chunked/manifest flow
3. Start AI processing
4. Confirm no call to `reassemble-chunked-video` is required for the large-file path
5. Confirm `process-tv-with-qwen` receives `chunked:{sessionId}`
6. Confirm Qwen processes the ordered chunk URLs and writes results to `tv_transcriptions`
7. Confirm polling ends with `completed`
8. Confirm small/assembled TV files still work
9. Confirm radio and non-TV behavior is unchanged
