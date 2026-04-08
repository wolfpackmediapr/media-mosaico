

## New Edge Function: `process-tv-with-qwen`

### What this does

Creates a standalone Supabase Edge Function that processes TV videos using Alibaba's Qwen3.5-Omni model via the DashScope API (OpenAI-compatible). This runs independently from the existing Gemini pipeline — no existing files are modified.

### Architecture

```text
Frontend → calls process-tv-with-qwen → gets signed URL from Supabase Storage
  → sends video_url to DashScope API (qwen3.5-omni-plus)
  → receives transcription + analysis
  → writes results to tv_transcriptions table
```

Key difference from Gemini: Qwen accepts a direct video URL — no File API upload/polling needed. This eliminates the entire upload → wait-for-ACTIVE → transcribe → analyze multi-step pipeline.

### API format (confirmed from research)

```text
POST https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions
Authorization: Bearer $QWEN_API_KEY
Content-Type: application/json

{
  "model": "qwen3.5-omni-plus",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "video_url", "video_url": { "url": "<signed-url>" } },
      { "type": "text", "text": "<prompt>" }
    ]
  }],
  "modalities": ["text"]
}
```

### Qwen limits (from docs)

- ~400 seconds (6.7 min) of 720p video per request at 256K token context
- Supports MP4, MOV, AVI
- Video must be publicly accessible URL (Supabase signed URLs work)
- Recommended: videos under 30 minutes, chunked for best results

### Files created

**1. `supabase/functions/process-tv-with-qwen/index.ts`**

Single file containing:

- **CORS handler** — standard OPTIONS preflight
- **Auth validation** — verify JWT from request header
- **Request parsing** — accept `videoPath`, `transcriptId`, `categories`, `clients`
- **Signed URL generation** — create 1-hour signed URL from Supabase Storage for the video
- **Qwen API call** — OpenAI-compatible POST to DashScope with `video_url` content type
- **Two-stage processing**:
  - Stage 1: Transcription (reuse the existing `buildTranscriptionOnlyPrompt()` style prompt, adapted for Qwen)
  - Stage 2: Analysis (reuse the existing `constructTvPrompt()` style prompt with the transcription as context)
- **Retry logic** — exponential backoff on 429, up to 3 attempts
- **Model fallback** — if `qwen3.5-omni-plus` fails, retry with `qwen3.5-omni-flash`
- **DB write** — update `tv_transcriptions` with results, set `provider_used: 'qwen-primary'` or `'qwen-fallback'`
- **Error handling** — categorized errors, stored in `provider_fallback_reason`

**2. `supabase/config.toml` update**

Add function config entry:
```toml
[functions.process-tv-with-qwen]
verify_jwt = true
```

### What is NOT included in Phase 1

- **Chunking logic** — Phase 1 handles videos ≤6.7 min. For 17-min videos, the function will return a clear error: "Video exceeds Qwen single-request limit. Chunking available in Phase 2."
- **Frontend integration** — no UI changes; test via curl only
- **No modifications** to `process-tv-with-gemini`, radio, press, or any other module

### Database changes (proposed, not executed)

```sql
ALTER TABLE tv_transcriptions
ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 1;
```

This column will track how many chunks a video was split into (default 1 for single-request). Only needed for Phase 2 chunking.

### Secret needed

- `QWEN_API_KEY` — Alibaba Cloud DashScope API key (user must add before deploying)

### Test curl command

```bash
curl -X POST \
  https://qpozetnbnzdinqkrafze.supabase.co/functions/v1/process-tv-with-qwen \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "videoPath": "tv-videos/sample-5min.mp4",
    "transcriptId": "<existing-transcript-uuid>",
    "categories": ["Política", "Economía"],
    "clients": [{"name": "LUMA", "keywords": ["energía", "apagón"]}]
  }'
```

### Summary table

| Item | Detail |
|------|--------|
| New files | `supabase/functions/process-tv-with-qwen/index.ts` |
| Modified files | `supabase/config.toml` (add function entry only) |
| New secret | `QWEN_API_KEY` |
| DB migration | `chunk_count` column (proposed, Phase 2) |
| Video limit | ≤6.7 min in Phase 1 |
| Fallback | `qwen3.5-omni-plus` → `qwen3.5-omni-flash` |
| Existing code touched | None |

