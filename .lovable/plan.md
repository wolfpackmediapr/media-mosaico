

## Why Speaker Names Appear in Analysis but Not in Transcription

### The explanation

The **analysis** and **transcription** take two completely different paths:

**Analysis** (where names DO appear): The analysis prompt (line 126) explicitly tells Qwen: *"Utilizar los nombres específicos de los hablantes cuando estén disponibles en lugar de SPEAKER A o SPEAKER B"*. Since Qwen receives the full transcription text and is a smart language model, it **infers** speaker identities from dialogue context clues (self-introductions, third-party mentions) and writes names in its analysis output. The analysis is generated fresh — Qwen writes it from scratch.

**Transcription** (where names DON'T appear): The speaker identification step (lines 635-716) tries to send the first video chunk (`chunk_0000`) to `qwen-vl-max` for visual identification. But **raw chunks are byte slices of the original file, not valid standalone video files**. The vision model returns a 400 error ("Invalid video file"), the step fails silently (caught by the try/catch at line 717), and the transcription keeps the generic `SPEAKER A`, `SPEAKER B` labels from AssemblyAI.

In short: the analysis works because Qwen **writes new text** and can infer names. The transcription fails because the vision call crashes on invalid chunk files, and the fallback doesn't run.

### Fix

**File**: `supabase/functions/process-tv-with-qwen/index.ts` (lines 689-699)

When the vision call fails (which it always will for chunks), the code should fall back to **text-only** speaker identification using `qwen-plus` instead of silently giving up. The current code uses `firstChunkUrl ? VISION_MODEL : TEXT_MODEL` (line 699), which means it tries vision when a URL exists — but the URL is always obtainable, it's just not a valid video file.

**Change**: Remove the vision attempt for chunked files entirely. Use `TEXT_MODEL` (`qwen-plus`) directly with the enhanced prompt. The text model can still identify speakers from dialogue clues (same way the analysis does), and will apply descriptive fallbacks ("Presentador principal", "Reportera en campo") for speakers it can't name.

```
Lines 689-699 — replace with:

// For chunked files, skip vision (chunks are raw byte slices, not valid video files)
// Use text-only model which can still identify speakers from dialogue context
const speakerIdMessages = [
  { role: 'user', content: speakerIdPrompt }
];

const speakerIdResult = await callQwenStreaming(
  qwenApiKey, TEXT_MODEL, speakerIdMessages, requestId, 'speaker-id', 2048
);
```

Also simplify the prompt (line 656) to remove the conditional video reference since we won't be sending video:

```
Line 656: change to just text-based prompt (remove ${firstChunkUrl ? 'este video y ' : ''})
```

And keep lines 639-654 (the chunk URL fetching block) — remove it entirely since it's unused now for chunked files.

### Scope
- One file, ~15 lines changed
- Redeploy edge function
- No frontend, radio, UI, or DB changes
- Small file path (valid video URL → vision model) stays unchanged
- Analysis prompt unchanged

### Expected result
After this fix, the transcription text stored in the DB will have speakers labeled as `SPEAKER A (Silverio Pérez - Presentador):` instead of bare `SPEAKER A:`, matching what the analysis already does. The frontend parser already supports this format.

