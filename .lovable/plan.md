

# Plan: Revert to Stable Gemini Models

## Problem

The previous update changed model references to `gemini-2.5-flash-preview-05-20`, which is **not a valid model identifier** in the Gemini API. This is causing 404 errors:

```
models/gemini-2.5-flash-preview-05-20 is not found for API version v1beta
```

## Solution

Revert all 15 model references across 9 edge function files back to `gemini-2.5-flash`, which is the stable model available until June 17, 2026.

**Note:** The embedding model `text-embedding-005` will remain unchanged as it is a valid successor to the deprecated `text-embedding-004`.

---

## Files to Update

### 1. supabase/functions/process-tv-with-gemini/index.ts
**5 occurrences** (lines 427, 673, 808, 1044, 1106):
```
gemini-2.5-flash-preview-05-20 → gemini-2.5-flash
```

### 2. supabase/functions/process-tv-with-gemini/gemini-unified-processor.ts
**1 occurrence** (line 350):
```
gemini-2.5-flash-preview-05-20 → gemini-2.5-flash
```

### 3. supabase/functions/process-tv-with-gemini/gemini-client.ts
**1 occurrence** (line 184):
```
gemini-2.5-flash-preview-05-20 → gemini-2.5-flash
```

### 4. supabase/functions/analyze-tv-content/index.ts
**2 occurrences** (lines 148, 191):
```
gemini-2.5-flash-preview-05-20 → gemini-2.5-flash
```

### 5. supabase/functions/process-press-pdf/index.ts
**3 occurrences** (lines 220, 394, 1162):
```
gemini-2.5-flash-preview-05-20 → gemini-2.5-flash
```

### 6. supabase/functions/process-press-pdf-filesearch/index.ts
**2 occurrences** (lines 441, 598):
```
gemini-2.5-flash-preview-05-20 → gemini-2.5-flash
```

### 7. supabase/functions/search-press-filesearch/index.ts
**1 occurrence** (line 95):
```
gemini-2.5-flash-preview-05-20 → gemini-2.5-flash
```

### 8. supabase/functions/reanalyze-articles/index.ts (Lovable AI Gateway)
**1 occurrence** (line 113):
```
google/gemini-2.5-flash-preview-05-20 → google/gemini-2.5-flash
```

### 9. supabase/functions/process-rss-feed/index.ts (Lovable AI Gateway)
**1 occurrence** (line 527):
```
google/gemini-2.5-flash-preview-05-20 → google/gemini-2.5-flash
```

---

## Summary

| Component | Change |
|-----------|--------|
| Total files | 9 |
| Total model references | 17 |
| Model change | `gemini-2.5-flash-preview-05-20` → `gemini-2.5-flash` |
| Embedding model | Keep `text-embedding-005` (valid) |

---

## Verification After Implementation

1. Deploy all 9 edge functions
2. Test TV video processing - should no longer get 404 errors
3. Test PDF processing in Prensa Escrita
4. Check edge function logs for successful API calls

