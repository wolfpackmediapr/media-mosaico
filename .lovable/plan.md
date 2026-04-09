

## Fix Speaker Labels + Add Speaker Name Identification + Bold Text Rendering

### Problem 1: Duplicate speaker labels ("SPEAKER 1: SPEAKER A:")
AssemblyAI returns `SPEAKER A`, `SPEAKER B` (letters). The edge function formats them as `[00:00] SPEAKER A: text`. The frontend parser (`speakerTextParser.ts`) only matches `SPEAKER \d+` (numbers), so it wraps every line in a new `SPEAKER 1:`, creating the ugly duplication.

### Problem 2: No speaker names for large files
For small files, Qwen vision reads lower thirds and chyrons to identify speakers. For large chunked files processed via AssemblyAI, speakers are anonymous letters (A, B, C). No identification step exists.

### Problem 3: Raw `***` instead of bold text in analysis
The `TvFormattedAnalysisResult` strips markdown with regex and renders in a plain `<Textarea>` which can't display rich text.

---

### Fix 1: Speaker parser — support letters (frontend)
**File**: `src/utils/tv/speakerTextParser.ts`
- Line 20: Change regex from `SPEAKER\s+(\d+)` to `SPEAKER\s+(\w+)` to capture letters (A, B, C) and numbers
- Lines 57-65: Same change in all pattern regexes — `\d+` → `\w+`
- Line 317 (`hasTvSpeakerPatterns`): Same fix

This makes `SPEAKER A` parse correctly instead of falling through to a generic wrapper.

### Fix 2: Speaker name identification step (edge function)
**File**: `supabase/functions/process-tv-with-qwen/index.ts`

After AssemblyAI returns the transcription and before running the full analysis, add a lightweight Qwen text call:

```
Prompt: "Given this transcription with speaker labels (SPEAKER A, SPEAKER B, etc.), 
identify each speaker by name and role based on context clues in the dialogue 
(self-introductions, mentions by others, role indicators like 'reportera', 'doctor', etc.).
Return ONLY a JSON mapping: {"A": "Name - Role", "B": "Name - Role", ...}
If you cannot identify a speaker, use their letter."
```

Then do a simple find-replace on the transcription text: `SPEAKER A` → `SPEAKER A (Silverio Pérez - Presentador)` before storing it.

This uses `qwen-plus` (text model, cheap, fast) and adds ~2-3 seconds. The names then flow through to both the transcription display AND the analysis prompt.

### Fix 3: Rich text rendering in analysis (frontend)
**File**: `src/components/tv/analysis/TvFormattedAnalysisResult.tsx`
- Remove `cleanAnalysisText` function (lines 15-19) that strips `**` markers
- Replace `<Textarea>` with a `<div>` that renders content with actual bold/italic
- Convert `**text**` → `<strong>text</strong>` and `*text*` → `<em>text</em>` using a simple render function
- Keep the same blue/yellow card layout and scrollable container
- Use `contentEditable` if editing capability is needed, or make it read-only

---

### Files changed

| File | Change |
|------|--------|
| `src/utils/tv/speakerTextParser.ts` | `\d+` → `\w+` in ~6 regex patterns |
| `supabase/functions/process-tv-with-qwen/index.ts` | Add speaker identification step after AssemblyAI, before analysis |
| `src/components/tv/analysis/TvFormattedAnalysisResult.tsx` | Replace Textarea with rich-text div rendering |

### What stays the same
- No radio, press, or navigation changes
- No DB migration
- AssemblyAI and Qwen analysis pipelines unchanged
- Master prompts unchanged
- Small file Qwen vision speaker ID unchanged

