

# Plan: Fix Truncated JSON Response in PDF Processing

## Problem Identified

The `process-press-pdf-filesearch` edge function is failing because Gemini's response is **truncated before the JSON is complete**.

**Evidence from logs:**
```
[FileSearch] Raw API response: ```json
{
  "summary": "RESUMEN EJECUTIVO:\nEl documento \"EL VOCERO DE PUERTO RICO\", publicado el viernes 31 de octubre de 2025...
```

The response is cut off - there's no closing `}` for the JSON object, causing the parser to fail with:
```
Error: No JSON object found in API response
```

**Root cause:** The `maxOutputTokens: 8192` limit is being hit because the prompt requests a very detailed 500+ word summary with multiple sections.

---

## Solution

### Option 1: Increase Token Limit (Quick Fix)

Increase `maxOutputTokens` from 8192 to 16384 to allow for longer responses:

```typescript
generationConfig: {
  temperature: 0.3,
  topK: 20,
  topP: 0.8,
  maxOutputTokens: 16384  // Doubled from 8192
}
```

### Option 2: Reduce Summary Complexity (Recommended - More Robust)

Simplify the expected output format to require less tokens:
- Reduce minimum summary length from 500 to 300 words
- Limit "Artículos Destacados" to 5 instead of 5-10
- Condense section descriptions

### Option 3: Add Truncation Detection + Retry (Most Robust)

1. Detect when response is truncated (missing closing brace)
2. Retry with a simpler prompt requesting less detail
3. Add fallback to create a minimal valid response

---

## Recommended Implementation

Combine approaches for maximum reliability:

| File | Change |
|------|--------|
| `supabase/functions/process-press-pdf-filesearch/index.ts` | 1. Increase `maxOutputTokens` to 16384 |
| | 2. Add truncation detection logic |
| | 3. Add retry with simplified prompt on truncation |

---

## Implementation Details

### Change 1: Increase Token Limit
```typescript
// Line ~456
maxOutputTokens: 16384  // Was 8192
```

### Change 2: Add Truncation Detection + Fallback

After the regex fails to find a complete JSON object, detect if the response was truncated and generate a fallback:

```typescript
// After line 542 - when no valid JSON found
// Check if this looks like truncated JSON (starts with { but no closing })
if (cleanContent.startsWith('{') && !cleanContent.includes('}')) {
  console.log('[FileSearch] Detected truncated JSON response, using fallback');
  
  // Extract what we can from the partial response
  const partialSummary = cleanContent.match(/"summary"\s*:\s*"([^"]+)/)?.[1] || 
    `Documento de prensa: ${publicationName}`;
  
  return {
    summary: partialSummary.replace(/\\n/g, '\n'),
    clippingsCount: 0,
    categories: [],
    keywords: [],
    relevantClients: []
  };
}
```

### Change 3: Simplify Prompt (Optional)

Reduce the expected summary detail to fit within token limits more reliably.

---

## Summary

| Aspect | Details |
|--------|---------|
| Files to modify | 1 (`supabase/functions/process-press-pdf-filesearch/index.ts`) |
| Primary fix | Increase `maxOutputTokens` to 16384 |
| Fallback | Detect truncated JSON and return partial summary |
| Risk level | Low - changes are additive and improve robustness |

