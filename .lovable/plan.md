

## Add Client Identification to TV Analysis

### Problem
The edge function `process-tv-with-qwen` already has full client support in the prompt (sections 10-11 with client names and keyword correlation mapping). However, **neither frontend caller sends `clients` or `categories` to the edge function**, so both arrays are always empty and the prompt never includes client identification.

### Root Cause
- `src/hooks/tv/useTvVideoProcessor.ts` (line 404-407): sends only `videoPath` and `transcriptionId`
- `src/hooks/tv/useTvAnalysis.ts` (line 107-111): sends only `videoPath`, `transcriptionId`, `transcriptionText`
- Neither fetches clients from the `clients` table or categories from the `categories` table before invoking

### Fix

**Option A (preferred): Fetch clients/categories server-side in the edge function**

This is more robust — the edge function already has a Supabase service-role client. Instead of relying on the frontend to pass clients, the edge function fetches them directly from the DB.

**File**: `supabase/functions/process-tv-with-qwen/index.ts`

After line 795 (where `categories` and `clients` are parsed from the body), add a fallback that fetches from DB when the arrays are empty:

```typescript
// If no clients/categories passed from frontend, fetch from DB
let resolvedClients = clients;
let resolvedCategories = categories;

if (resolvedClients.length === 0) {
  const { data: dbClients } = await supabaseClient
    .from('clients')
    .select('name, keywords');
  resolvedClients = dbClients || [];
}

if (resolvedCategories.length === 0) {
  const { data: dbCategories } = await supabaseClient
    .from('categories')
    .select('name_es');
  resolvedCategories = (dbCategories || []).map(c => c.name_es);
}
```

Then use `resolvedClients` and `resolvedCategories` in all downstream calls to `buildAnalysisPrompt()` and `processChunkedInBackground()`.

### Also improve the prompt's client section

The current client section (lines 154-163) is minimal — just a list of names and a keyword correlation. Enhance it to instruct Qwen to produce a dedicated **"Relevancia para Clientes"** subsection in the analysis output:

```
10. **Relevancia para Clientes**: Para CADA cliente de la lista, evalúa si el contenido es relevante:
    - Nombre del cliente
    - Nivel de relevancia: ALTA / MEDIA / BAJA / NO RELEVANTE
    - Palabras clave encontradas en la transcripción que coinciden
    - Citas textuales que justifican la relevancia
    - Recomendación de acción (monitorear, alertar, ignorar)

Lista de clientes: ${clientsText}

Correlación clientes-palabras clave:
${clientKeywordMap}
```

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/process-tv-with-qwen/index.ts` | Fetch clients/categories from DB when not provided; enhance client relevance section in prompt; use resolved arrays in all `buildAnalysisPrompt` calls |

### What stays the same
- No frontend changes needed (edge function self-resolves)
- No DB migration
- No radio, press, or UI changes
- Transcription prompts unchanged
- Ad/program separation unchanged

### Expected result
After this fix, every TV analysis will automatically include a "Relevancia para Clientes" section listing each client from the Clientes settings tab, their relevance level, matched keywords, and supporting quotes from the transcription.

