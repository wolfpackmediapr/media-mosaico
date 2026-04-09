

## Fix: Qwen Analysis 403 + [object Object] Display

### What you described vs what the plan does

Yes — this is exactly inline with your vision:

1. **Qwen vision** identifies speakers visually (lower thirds, clothing, chyrons, PR personalities) — this already works for **small/single files** via `video_url` + `buildTranscriptionOnlyPrompt()` (lines 742-750)
2. **AssemblyAI** does the audio transcription for **large chunked files** (since Qwen can't receive 350MB video in one call)
3. **Qwen text analysis** runs the full 5W analysis on the transcription — same master prompt structure as Gemini

The speaker naming (`SPEAKER 1 (Name - Role):`) is already in the prompt for single files. For large files, AssemblyAI returns `SPEAKER A/B/C` labels but not names — so we should add a Qwen step that takes AssemblyAI's raw speaker-labeled text and enriches it with visual context from a few key frames (if available), or at minimum keeps the `SPEAKER X:` format consistent.

### Two bugs to fix now

**Bug 1: Qwen 403 on text-only analysis calls**

The `callQwenStreaming` function uses `qwen3.5-omni-plus` (a multimodal model) for the text-only analysis step. Omni models require audio/video input — text-only calls return 403. The fix: use a text-compatible model (`qwen-plus`) for analysis calls.

- **File**: `supabase/functions/process-tv-with-qwen/index.ts`
- Add constant: `const TEXT_MODEL = 'qwen-plus';`
- Line 502: Change `callQwenStreaming(qwenApiKey, PRIMARY_MODEL, ...)` → `callQwenStreaming(qwenApiKey, TEXT_MODEL, ...)`
- Line 506: Change fallback to `TEXT_MODEL` as well (or `qwen-turbo`)
- Line 788-795: Same change for the single-file analysis path — use `TEXT_MODEL` instead of `analysisModel`

**Bug 2: `[object Object]` in analysis display**

When analysis fails (403), the function stores `{"error":"HTTP 403:...","parsed":false}` in `full_analysis`. The parser hits line 165: `parsed.toString()` → `[object Object]`.

- **File**: `src/utils/tv/analysisParser.ts`
- In `convertJsonToReadableFormat` (line 163-166), before falling through to `parsed.toString()`, check for error objects:
```
if (parsed.error) {
  return `Error en análisis: ${parsed.error}`;
}
if (parsed.raw_analysis && typeof parsed.raw_analysis === 'string') {
  return parsed.raw_analysis;
}
if (!isAnalysisJson) {
  return JSON.stringify(parsed, null, 2);
}
```

### Scope

| File | Change |
|------|--------|
| `supabase/functions/process-tv-with-qwen/index.ts` | Add `TEXT_MODEL = 'qwen-plus'`, use it for all text-only analysis calls (4 lines) |
| `src/utils/tv/analysisParser.ts` | Handle error/unparseable objects gracefully instead of `.toString()` |

### What stays the same
- No radio, press, navigation, or UI layout changes
- No DB migration
- Qwen vision still used for transcription on single files
- AssemblyAI still used for large file audio transcription
- Master prompts (`buildTranscriptionOnlyPrompt`, `buildAnalysisPrompt`) unchanged
- Speaker identification prompt with lower thirds, chyrons, PR personalities unchanged

### Expected result after fix
- AssemblyAI transcription works (already confirmed)
- Qwen `qwen-plus` runs 5W analysis successfully on the transcription text
- Analysis displays formatted sections (5W, resumen, palabras clave, relevancia clientes, alertas) instead of `[object Object]`
- Speaker labels show `SPEAKER 1 (Name - Role):` for small files (Qwen vision) and `SPEAKER A/B/C:` for large files (AssemblyAI)

