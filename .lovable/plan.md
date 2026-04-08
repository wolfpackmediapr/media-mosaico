

## Fix: Remove Failing Client-Side Reassembly, Add Chunked Detection to Qwen

### Problem
The client-side reassembly downloads all chunks (~350MB) then tries to upload a single blob back to the `video` bucket, which rejects it due to bucket file size limits. This is the direct cause of every recent 500.

### Solution
Two changes — stop the frontend from attempting the impossible upload, and make the Qwen function handle `chunked:` references gracefully.

### File 1: `src/hooks/tv/useTvVideoProcessor.ts`

**Lines ~169-226**: Replace the entire client-side reassembly block (download chunks → build blob → upload → update DB) with a simple path assignment:

```typescript
if (!chunkedFilePath && matchingChunkSession.playback_type === 'chunked' && matchingChunkSession.manifest_created) {
  console.log('[TvVideoProcessor] Manifest-based chunked upload — passing chunked reference to backend');
  chunkedFilePath = `chunked:${matchingChunkSession.session_id}`;
}
```

This eliminates the 350MB download+upload cycle entirely. The rest of the flow (transcription lookup, skipUpload, public URL for playback) stays the same.

**Lines ~285-291**: The public URL generation for playback still needs a real storage path. When `chunkedFilePath` starts with `chunked:`, use the first chunk's path or skip the public URL assignment (the video player already handles chunked playback via manifest).

### File 2: `supabase/functions/process-tv-with-qwen/index.ts`

**After parsing `videoPath` (~line 205)**: Add detection for `chunked:` prefix:

```typescript
if (videoPath.startsWith('chunked:')) {
  const sessionId = videoPath.replace('chunked:', '');
  console.log(`[qwen-tv] Chunked session detected: ${sessionId}`);
  
  // Update transcription status with clear message
  if (transcriptId) {
    await supabaseClient.from('tv_transcriptions').update({
      status: 'failed:manifest_not_supported',
      progress: 0,
      error_message: 'Video demasiado grande para procesamiento AI. La reproducción funciona correctamente.',
      updated_at: new Date().toISOString(),
    }).eq('id', transcriptId);
  }
  
  return new Response(JSON.stringify({
    success: false,
    error: 'MANIFEST_NOT_SUPPORTED',
    message: 'Este video usa almacenamiento fragmentado. El análisis AI requiere un archivo único. La reproducción del video funciona correctamente.',
  }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
```

### File 1 additional: Error handling for 422

In the section where Qwen function response is handled (~line 500+), add handling for the `MANIFEST_NOT_SUPPORTED` error code so the UI shows a specific toast instead of a generic failure.

### What this achieves
- Large chunked uploads stop crashing with "exceeded maximum allowed size"
- Users get a clear Spanish-language message explaining playback works but AI analysis is blocked
- The transcription record gets a specific failure status (`failed:manifest_not_supported`) instead of hanging
- No more infinite polling loops for these files

### What stays the same
- No radio, press, or UI layout changes
- No DB migration needed
- Gemini function untouched
- Chunk upload flow untouched
- Small/medium files that already have `assembled_file_path` continue working normally

### Future: To enable AI analysis for large files
A separate storage bucket limit increase (`UPDATE storage.buckets SET file_size_limit = 524288000 WHERE name = 'video'`) would allow the client-side reassembly to succeed. That is a separate approval item.

