

## Review of Last Night's Changes — TV Prompts (Gemini + Qwen)

I audited all four TV prompt builders. The intended approach was implemented, but with **two inconsistencies** between paths and **one self-contradiction** that needs fixing.

---

### Summary of changes found

| Change | Gemini (`process-tv-with-gemini`) | Qwen (`process-tv-with-qwen`) |
|---|---|---|
| 1. Speaker continuity paragraph (transcription prompt) | ✅ Present (lines 195-199) | ✅ Present (lines 58-62) |
| 2. Per-story segmentation section (analysis prompt) | ✅ Present — JSON `noticias[]` array (lines 90-101, 130-145) | ✅ Present — `[NOTICIA N]` blocks (lines 137-160) |
| 3. "No duplicate citations" instruction | ✅ Present (line 101) | ✅ Present (line 162) |

So the three changes ARE in place on both paths. But the implementations diverge in two places.

---

### Issues found

**Issue A — Format divergence between Gemini and Qwen (Per-Story section)**

- **Gemini** outputs JSON (`responseMimeType: "application/json"`, `maxOutputTokens: 4096`) → uses `noticias[]` array.
- **Qwen** outputs free-form text → uses `[NOTICIA 1]`, `[NOTICIA 2]` headers.

This is actually **correct** because the downstream parsers expect different formats per provider. ✅ No change needed — just flagging for awareness.

**Issue B — Self-contradiction in citation instructions (Qwen analysis prompt)**

In `process-tv-with-qwen/index.ts`:
- Line 162: *"NO repitas citas textuales completas de la transcripción en el análisis. Resume los puntos clave."*
- Line 218 (client-relevance): *"Citas textuales de la transcripción que justifican la relevancia"*
- Line 230 (client-relevance fallback): *"Citas textuales de la transcripción que justifican la relevancia"*
- Line 242 (closing instructions, point 6): *"Proporcionar citas textuales exactas de la transcripción para respaldar el análisis"*

The model is told **don't repeat citations** AND **always include exact citations** — contradictory. This is the "duplicate citation instruction" the user mentions.

**Issue C — Same contradiction exists in Gemini path** (line 101 vs. the implicit citation expectations in JSON schema, though milder since Gemini's JSON schema doesn't explicitly demand citations).

**Issue D — Orphaned numbering in Qwen analysis prompt**

Lines 154-160 list per-noticia items numbered 1-6 (correct). Then line 164 jumps to `2. Temas principales` (global). The numbering restarts at 2 because the original outline #1 was replaced by the new per-noticia block. Confusing but harmless to the model — minor cleanup.

---

### Proposed fix (minimal, surgical)

**File 1: `supabase/functions/process-tv-with-qwen/index.ts`**

Replace line 162 with a clarified rule that resolves the contradiction:

```
NOTA SOBRE CITAS: Usa citas textuales BREVES (máx. 1-2 oraciones) SOLO donde se requieran 
explícitamente (sección de Relevancia para Clientes). En el resumen y análisis general, 
parafrasea en tus propias palabras — NO copies párrafos completos de la transcripción.
```

Update closing instruction #6 (line 242) from:
> "Proporcionar citas textuales exactas de la transcripción para respaldar el análisis"

to:
> "Usar citas textuales BREVES (1-2 oraciones máx.) únicamente donde se requieran (relevancia de clientes); en otras secciones, parafrasear"

Fix orphaned numbering: relabel lines 164-189 starting at the correct number, or convert the per-noticia 1-6 list (lines 154-160) into a single nested bullet block under the `[NOTICIA N]` template so the global outline continues cleanly from `1. Tipo de contenido` → `2. Temas` → ... → `10. Relevancia`.

**File 2: `supabase/functions/process-tv-with-gemini/index.ts`** (and its mirror in `analyze-tv-content/tvPromptBuilder.ts`)

Replace line 101 of `process-tv-with-gemini/index.ts` with the same clarified rule:

```
NOTA SOBRE CITAS: En los campos de resumen ("resumen", "resumen_noticia"), parafrasea — 
no copies texto literal de la transcripción. Las citas textuales BREVES son aceptables 
solo dentro de "relevancia_clientes[].razon" cuando justifiquen la relevancia.
```

`analyze-tv-content/tvPromptBuilder.ts` is the legacy non-segmented prompt — no per-story section, no contradiction. **Leave it untouched** unless you want full parity (it's only used by the older `analyze-tv-content` function, not the active Qwen/Gemini pipelines).

---

### Verification plan after edits

1. Deploy both functions: `process-tv-with-qwen`, `process-tv-with-gemini`.
2. Run one TV job through each path.
3. Confirm in `tv_transcriptions.analysis_result`:
   - `noticias[]` (Gemini) or `[NOTICIA N]` blocks (Qwen) are present and non-empty.
   - `resumen` field has paraphrased content, not copy-pasted transcription chunks.
   - `relevancia_clientes[].razon` still contains short justifying quotes.

### Scope
- 2 files modified (~6 lines changed total)
- No DB, no frontend, no schema changes
- Resolves the contradiction the user flagged ("modify 1 line — duplicate citation instruction")

