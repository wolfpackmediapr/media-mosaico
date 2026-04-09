

## Fix Client Relevance Section in TV Analysis Prompt

### Problem
The current prompt (lines 163-192) instructs Qwen to evaluate **every** client including irrelevant ones ("Incluye TODOS los clientes aunque no sean relevantes"), producing long lists of "NO RELEVANTE / ignorar" entries that clutter the output. The user wants:

1. Only show clients that **are** relevant (skip irrelevant ones entirely)
2. Broaden matching criteria to include **industry competitors** and **sector-related news**, not just direct client mentions or keyword matches
3. Keep the segment-like structure that was working before (integrated into each Programa Regular section, not a separate exhaustive list)

### Changes

**File**: `supabase/functions/process-tv-with-qwen/index.ts`

**Lines 159-192** — Replace the client relevance sections with:

```
9. Presencia de personas o entidades relevantes mencionadas

10. **Relevancia para Clientes**: Evalúa el contenido contra la siguiente lista de clientes. SOLO incluye los clientes para los cuales el contenido ES relevante (nivel ALTA o MEDIA). NO listes clientes que no tienen relevancia.

Criterios de relevancia (incluir si cumple AL MENOS uno):
- Mención directa del cliente, sus productos o servicios
- Mención de competidores directos del cliente en su industria
- Noticias del sector o industria del cliente que podrían afectarlo
- Regulaciones, legislación o políticas públicas que impacten al cliente
- Tendencias del mercado relevantes para el negocio del cliente
- Coincidencia con las palabras clave asignadas al cliente

Lista de clientes y sus palabras clave:
${clientKeywordMap}

Para cada cliente RELEVANTE indica:
    - Nombre del cliente
    - Nivel de relevancia: ALTA / MEDIA
    - Razón de relevancia (mención directa, competidor, industria, regulación, etc.)
    - Palabras clave o menciones encontradas
    - Citas textuales de la transcripción que justifican la relevancia
```

Also update line 192 (closing instruction #7) from:
```
7. Incluir la sección de Relevancia para Clientes con evaluación para CADA cliente de la lista
```
to:
```
7. Incluir la sección de Relevancia para Clientes SOLO con los clientes relevantes (omitir los no relevantes)
```

### Scope
- One file, ~30 lines changed in the prompt text
- Redeploy edge function
- No frontend, DB, or radio changes

