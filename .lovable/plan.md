

## Fix: Make Qwen Actually Work + Handle Large Chunked Videos

### Why Gemini is not the answer

You're right. Gemini has aggressive rate limits (Tier 1), the dual-key rotation is already complex, and in production with multiple users uploading simultaneously, you'll hit 429s constantly. We should not route more traffic to Gemini.

### What's actually broken with Qwen right now

Two issues — both fixable:

1. **Missing `stream: true`**: Alibaba docs say explicitly: *"All requests to Qwen-Omni must set `stream=True`."* The current code sends non-streaming requests, which causes 403/400 errors. This is why Qwen never runs.

2. **Model names are correct** (`qwen3.5-omni-plus` / `qwen3.5-omni-flash`) — confirmed from Alibaba's official docs. The previous plan to change them to `qwen3-omni-plus` was wrong.

### The chunk problem

Individual 15MB chunks are raw byte slices (not valid video containers). Qwen can't process them individually. But Qwen supports videos up to ~400 seconds (~6.7 min) per request via URL.

### Solution: Qwen for everything, with smart chunking strategy

**For small/medium files (single file, <400s):**
- Fix `stream: true` in `callQwen()` and parse SSE response
- Send the signed URL directly — this works today except for the streaming bug

**For large chunked files (>400s, manifest-based):**
- The edge function downloads the chunks from storage sequentially and concatenates them in memory
- Instead of re-uploading to Supabase (which fails), upload directly to **AssemblyAI** (already configured, API key exists) for transcription
- AssemblyAI handles files of any length, has speaker diarization built-in, and supports Spanish
- Then send the transcription text to Qwen (text-only, no video) for the 5W analysis step
- Text-only Qwen calls are cheap, fast, and don't hit video rate limits

```text
Small file path:
  signed URL → Qwen (streaming, video+audio) → transcription + analysis

Large file path:
  chunks → download in edge function → upload to AssemblyAI → transcription with speaker labels
  → transcription text → Qwen (text-only) → 5W analysis
```

### Why this works

- **No Gemini at all** — zero dependency on Google for TV processing
- **No Supabase storage re-upload** — the blocker is eliminated
- **AssemblyAI handles any file size** — their upload endpoint accepts direct binary, no URL needed
- **Speaker diarization free** — AssemblyAI identifies speakers automatically (perfect for TV news)
- **Qwen text analysis is cheap** — text-only calls have no video token overhead
- **Both services have separate rate limits** — no single bottleneck in production

### Files to change

| File | Change |
|------|--------|
| `supabase/functions/process-tv-with-qwen/index.ts` | Add `stream: true`, parse SSE response, add AssemblyAI path for chunked videos |
| `src/hooks/tv/useTvVideoProcessor.ts` | No change needed — already passes `chunked:${sessionId}` correctly |

### What stays the same

- No radio, press, or UI changes
- No Gemini function changes
- No DB migration needed
- Small files still use Qwen directly
- Chunk upload and manifest playback unchanged
- Frontend orchestration unchanged

### Implementation details

1. **Fix `callQwen()`**: Add `stream: true` to request body, read SSE stream line-by-line, collect `delta.content` tokens, return concatenated text
2. **Add `processViaAssemblyAI()`**: Download chunks sequentially from storage → concatenate into single buffer → POST to `api.assemblyai.com/v2/upload` → create transcription job with `speaker_labels: true`, `language_code: 'es'` → poll until complete
3. **Update chunked path**: Replace chunk-by-chunk Qwen calls with AssemblyAI transcription → then Qwen text-only analysis
4. **Memory management**: Stream chunks in 1MB reads to avoid OOM; AssemblyAI upload endpoint accepts streaming bodies

### Validation

1. Upload a 300MB+ TV file
2. Confirm chunked playback works immediately
3. Start processing — confirm AssemblyAI receives the file and transcribes with speaker labels
4. Confirm Qwen runs text-only analysis on the transcription
5. Confirm `tv_transcriptions` is populated with completed status
6. Confirm small files still process via Qwen directly (with streaming fix)
7. Confirm no Gemini calls are made for TV processing

