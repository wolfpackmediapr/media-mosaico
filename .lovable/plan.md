

## Upgrade TV Analysis Prompt to Match Production Quality

### Problem
The current Qwen `buildAnalysisPrompt()` (lines 67-131 in `process-tv-with-qwen/index.ts`) is a stripped-down generic JSON prompt. The old Gemini prompt (lines 1440-1537 in `process-tv-with-gemini/index.ts`) produced the rich output shown in the DOCX — ad/program separation, 70-100 sentence summaries, client-keyword mapping, category justification, tone analysis. The Qwen version has none of this.

### What changes

**One file**: `supabase/functions/process-tv-with-qwen/index.ts`

Rewrite `buildAnalysisPrompt()` (lines 67-131) to replicate the Gemini `buildFullAnalysisPrompt` structure:

1. **Content-type separation**: Add `[TIPO DE CONTENIDO: ANUNCIO PUBLICITARIO]` and `[TIPO DE CONTENIDO: PROGRAMA REGULAR]` markers — the TV UI already renders these as yellow/blue cards
2. **Ad detection rules**: Prices, CTAs, contact info, repetitive brand mentions, persuasive language
3. **Ad detail extraction**: Brand, key messages, CTA, tone, duration per ad
4. **Program analysis**: 70-100 sentence summary with chronological development, textual quotes, participant interactions, speaker identification by name
5. **Temas principales**: Ordered by importance with subtopics and connections
6. **Tone analysis**: Formal/informal, language type, content focus (informativo/editorial/debate)
7. **Default categories fallback**: 16 hardcoded categories (same as radio) when none provided from DB
8. **Client-keyword correlation mapping**: Explicit `- ClientName: keyword1, keyword2` block (same format as radio)
9. **Category justification**: Principal and secondary categories with justification text
10. **Speaker name instructions**: When speaker labels are present, use names not generic labels
11. **Increase `max_tokens`** to accommodate richer structured output

The function signature stays the same: `buildAnalysisPrompt(categories, clients, transcriptionText, contextText)`. The clients and categories variables are already passed in — they just need to be formatted into the richer prompt structure (keyword mapping block, default categories list).

### Also fix the 403 bug (same file)
- Add `TEXT_MODEL = 'qwen-plus'` and `TEXT_MODEL_FALLBACK = 'qwen-turbo'`
- Use these for all text-only analysis calls instead of the Omni multimodal model

### Fix `[object Object]` display
**File**: `src/utils/tv/analysisParser.ts`
- Handle error objects gracefully in `convertJsonToReadableFormat`

### What stays the same
- No radio, press, navigation, or UI layout changes
- No DB migration
- `TvFormattedAnalysisResult.tsx` already supports `[TIPO DE CONTENIDO:]` markers
- `buildTranscriptionOnlyPrompt()` unchanged (visual speaker ID for small files)
- AssemblyAI pipeline for large files unchanged
- Redeploy edge function after changes

### Expected output quality
After this change, TV analysis output will match the DOCX reference: named speakers, ad/program separation with blue/yellow cards, 70-100 sentence summaries, categorized themes, client relevance with keyword justification, and tone analysis.

