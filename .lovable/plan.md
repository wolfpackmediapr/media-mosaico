

## Combined Fix: Retry Logic + MIME Type Bug + Build Errors

### Changes

#### 1. Add 429 retry logic to `uploadVideoToGeminiStream()`
**File:** `supabase/functions/process-tv-with-gemini/index.ts` (lines 228-244)

Wrap the resumable upload initialization in a retry loop (3 attempts, 15s/30s/60s backoff). Extract `Retry-After` header when available.

#### 2. Fix MIME type hardcoding on small-file path
**File:** `supabase/functions/process-tv-with-gemini/index.ts` (line 1102)

Replace:
```typescript
const videoBlob = new Blob([videoData], { type: 'video/mp4' });
```
With a helper that infers MIME from the file extension:
```typescript
function getMimeTypeFromPath(path: string): string {
  if (path.endsWith('.mov')) return 'video/quicktime';
  if (path.endsWith('.webm')) return 'video/webm';
  if (path.endsWith('.avi')) return 'video/x-msvideo';
  return 'video/mp4';
}
const videoBlob = new Blob([videoData], { type: getMimeTypeFromPath(videoPath) });
```

Also fix the display name fallback on line 1088 to preserve the actual extension instead of always defaulting to `.mp4`.

#### 3. Fix hardcoded MIME in gemini-client.ts (line 169)
**File:** `supabase/functions/process-tv-with-gemini/gemini-client.ts`

The `generateAnalysisWithVideo` function hardcodes `mime_type: 'video/mp4'`. Change to use the uploaded file's actual MIME type from `processedFile.mimeType`.

#### 4. Fix TypeScript build errors in process-press-pdf
**File:** `supabase/functions/process-press-pdf/index.ts`

- Line 878: Replace `publimediaClients` with `cachedClientsData?.clientsByCategory || {}`
- Line 982: Add null guard before accessing `clientsData.clients.length`
- Lines 1060, 1098, 1110: Add non-null assertion after the guard at 982

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/process-tv-with-gemini/index.ts` | Add retry loop to upload init; add `getMimeTypeFromPath()` helper; fix small-file blob MIME |
| `supabase/functions/process-tv-with-gemini/gemini-client.ts` | Use actual file MIME type instead of hardcoded `video/mp4` |
| `supabase/functions/process-press-pdf/index.ts` | Fix `publimediaClients` undefined + null guards |

### What this does NOT fix

**Tier 1 TPM ceiling** — if you're consistently over 1M TPM, retries delay failure but don't prevent it. You need to request Tier 2 access from Google for sustained multi-video processing. This is an infrastructure action, not a code fix.

