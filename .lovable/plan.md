## Diagnosis

The remaining `NO RELEVANTE` clients are still appearing because the current fix only filters structured JSON fields like `relevancia_clientes`. The screenshot shows a plain text / markdown-style analysis inside `[TIPO DE CONTENIDO: PROGRAMA REGULAR]`, and that path is currently returned mostly unchanged by `parseAnalysisContent()` via `consolidateContent()`.

So there are two layers to fix:

1. **Display/parser layer:** remove `NO RELEVANTE`, `bajo`, `ninguna`, `none`, `n/a`, and similar client relevance entries from already-saved or plain-text TV analyses before rendering.
2. **Prompt generation layer:** tighten TV prompts so new analyses do not ask for or encourage `bajo` values anywhere.

## Plan

1. **Add a TV-only text sanitizer in `src/utils/tv/analysisParser.ts`**
   - Detect the “Relevancia para Clientes” portion inside plain text TV analysis.
   - Remove bullet/list entries whose relevance says `NO RELEVANTE`, `bajo/baja/low`, `ninguna/none`, `n/a`, `na`, or `no especificado`.
   - Handle grouped entries like the screenshot where many clients are listed in one bullet before `Nivel de relevancia: NO RELEVANTE`.
   - Preserve all other analysis content, news summaries, copy button behavior, formatting, and TV card layout.

2. **Apply the sanitizer consistently in the TV parser paths**
   - Run it after JSON-to-readable conversion.
   - Run it inside the existing `[TIPO DE CONTENIDO: ...]` / `consolidateContent()` path.
   - Run it for structured-analysis text before rendering.
   - This ensures old database rows and new analyses are both cleaned at display time.

3. **Tighten the Gemini TV prompt in `supabase/functions/process-tv-with-gemini/index.ts`**
   - Remove the contradictory schema example that still says `"nivel_relevancia": "alto/medio/bajo"`.
   - Replace it with only `"ALTA/MEDIA"`.
   - Strengthen the instruction to never output placeholders or explicit “NO RELEVANTE” clients.

4. **Optionally align the secondary/shared TV prompt**
   - Update `supabase/functions/_shared/tvAnalysisPrompt.ts` only for the same relevance wording, without changing TV, Prensa Escrita, Radio, or site-wide behavior.

5. **Validate safely**
   - Use a small local sample matching your screenshot text to confirm the parser output removes only the `NO RELEVANTE` client bullets and keeps `First Medical`, `Auxilio Mutuo`, and `Para la Naturaleza`.
   - No DB schema changes, no Radio changes, no Prensa Escrita changes, no site-wide UI changes.