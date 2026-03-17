## TV Upload & Processing Optimization Plan

### Problem

The TV pipeline has performance bottlenecks (small chunks, sequential uploads, low token limits) and reliability issues (edge function memory limits for large files, failing `secure-transcribe`).

### Changes

#### 1. Increase chunk size and add parallel uploads

**File:** `src/hooks/use-chunked-video-upload.ts`

- Change `CHUNK_SIZE` from 5MB to 15MB
- Upload 3 chunks concurrently using `Promise.all` batches instead of sequential loop
- Remove unreachable `return null` at line 274

#### 2. Restore optimal Gemini token limits

**File:** `supabase/functions/process-tv-with-gemini/index.ts`

- Transcription call: `maxOutputTokens` from 16,384 →32,768 (staged increase — full 65,536 after Tier 2 approval)
- Reduce inter-call delay from 3s → 1s
  File: supabase/functions/process-tv-with-gemini/gemini-unified-processor.ts
  Analysis call: maxOutputTokens from 8,192 → 16,384 (staged increase — full 32,768 after Tier 2 approval)
  3. Fix secure-transcribe for large files
  File: supabase/functions/secure-transcribe/index.ts
  Add better error handling for oversized form data
  Return a clear error message when file exceeds 20MB limit instead of crashing
  4. Optimize edge function video handling
  File: supabase/functions/process-tv-with-gemini/index.ts
  For chunked files: always use the streaming path (already implemented) — ensure manifest-based streaming is the primary path, not the fallback
  For non-chunked files: stream directly from Supabase signed URL to Gemini instead of downloading entire blob into memory
  Technical Details
  Parallel chunk upload implementation:
  Before: chunk1 → chunk2 → chunk3 → chunk4 → ... (sequential)
  After: [chunk1, chunk2, chunk3] → [chunk4, chunk5, chunk6] → ... (batches of 3)
  Token limit staged restoration: moderate increase now (2x current values) to avoid exceeding Tier 1 TPM limits while awaiting Tier 2 approval. Full restoration to documented optimal values will follow.
  Files changed: 4 files (2 client-side, 2 edge functions)
  Risk: Low — chunk size and parallelism are additive improvements; token limits are being moderately increased as a staged approach to manage TPM usage.