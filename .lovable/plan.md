

## Plan: Full Large-File AI Processing (Implemented)

### What was done

1. **Migration**: Raised `video` bucket `file_size_limit` to 1GB (1073741824 bytes)

2. **`supabase/functions/reassemble-chunked-video/index.ts`**: 
   - No longer exits early on `status === 'completed'` — instead checks for existing `assembled_file_path`
   - Returns cached path immediately if already assembled
   - Normalizes fileName to basename to prevent path duplication
   - Stores `assembled_file_path` back to DB for caching

3. **`supabase/functions/process-tv-with-qwen/index.ts`**: 
   - Removed 422 `MANIFEST_NOT_SUPPORTED` rejection
   - Now resolves `chunked:` references by looking up `assembled_file_path` in DB
   - If not assembled yet, returns `REASSEMBLY_NEEDED` (422) so frontend can retry
   - Uses resolved path for signed URL generation

4. **`src/hooks/tv/useTvVideoProcessor.ts`**: 
   - Removed fail-fast block that rejected `chunked:` videos
   - Added auto-reassembly orchestration: checks for cached assembled path, calls reassembly if needed
   - Passes real assembled storage path to Qwen
   - Normalized `original_file_path` format to `chunked:${sessionId}` (no trailing filename)
   - Removed unreliable manifest error handler

### Expected flow after deployment
1. Upload 300MB+ TV file → chunks upload + manifest created
2. Click process → frontend detects `chunked:` → checks for assembled file
3. If not assembled → calls `reassemble-chunked-video` → waits for result
4. Assembled path cached in `chunked_upload_sessions.assembled_file_path`
5. Calls `process-tv-with-qwen` with real assembled path
6. Qwen processes video normally
7. Second run reuses cached assembled file (no re-assembly)
