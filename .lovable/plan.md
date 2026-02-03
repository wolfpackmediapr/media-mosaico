

# Plan: Fix Truncated JSON Parsing in PDF Processing

## Problem Analysis

The `process-press-pdf-filesearch` edge function is failing because:

1. **Token limit still exceeded**: Even with `maxOutputTokens: 16384`, the detailed prompt requesting 500+ word summaries with extensive structure is causing truncation
2. **JSON extraction fails**: When the JSON is truncated (missing closing `}`), `extractFirstBalancedJsonObject` returns `null`
3. **Fallback regex broken**: The pattern `/"summary"\s*:\s*"([\s\S]*?)"\s*(,|\n|$)/` fails on complex strings with escaped quotes, newlines, and special characters

## Solution

Implement a multi-layer fix:

### 1. Reduce Token Requirements (Primary Fix)

Simplify the prompt to require less output, reducing truncation risk:

| Current | New |
|---------|-----|
| 500+ word summary | 300 word summary |
| 5-10 highlighted articles | Maximum 5 articles |
| Extensive entity mentions | Brief entity list |

### 2. Better Truncation Detection + Repair

When JSON is truncated (more `{` than `}`):
- Detect the imbalance
- Try to repair by closing open braces
- Parse the repaired JSON

### 3. Improved Fallback Extraction

Replace the simple regex with a more robust extraction that:
- Finds the `"summary"` field start
- Tracks string boundaries properly (handling `\"` escaped quotes)
- Extracts whatever content is available

### 4. Never Throw on Parse Failure

The function must always return a valid response object, even if partial, to avoid 500 errors.

---

## Implementation Details

### File: `supabase/functions/process-press-pdf-filesearch/index.ts`

**Change 1: Add `repairTruncatedJson` helper function**

```typescript
function repairTruncatedJson(json: string): string {
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escaped = false;
  
  for (const ch of json) {
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = false; }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }
  
  let repaired = json;
  while (brackets > 0) { repaired += ']'; brackets--; }
  while (braces > 0) { repaired += '}'; braces--; }
  return repaired;
}
```

**Change 2: Add `extractSummaryFromPartialJson` helper**

```typescript
function extractSummaryFromPartialJson(content: string): string | null {
  const summaryStart = content.indexOf('"summary"');
  if (summaryStart === -1) return null;
  
  const colonPos = content.indexOf(':', summaryStart);
  if (colonPos === -1) return null;
  
  const quoteStart = content.indexOf('"', colonPos);
  if (quoteStart === -1) return null;
  
  // Find the end of the string value, handling escaped quotes
  let pos = quoteStart + 1;
  let escaped = false;
  while (pos < content.length) {
    const ch = content[pos];
    if (escaped) { escaped = false; pos++; continue; }
    if (ch === '\\') { escaped = true; pos++; continue; }
    if (ch === '"') {
      return content.slice(quoteStart + 1, pos);
    }
    pos++;
  }
  
  // If we didn't find a closing quote, return what we have
  return content.slice(quoteStart + 1);
}
```

**Change 3: Update `safeParsePossiblyEmbeddedJson` to use repair**

```typescript
function safeParsePossiblyEmbeddedJson(cleanContent: string): any {
  // 1) Try direct JSON
  try {
    return JSON.parse(cleanContent);
  } catch { /* continue */ }

  // 2) Try to extract first balanced JSON object
  const extracted = extractFirstBalancedJsonObject(cleanContent);
  if (extracted) {
    try {
      return JSON.parse(extracted);
    } catch { /* continue */ }
  }

  // 3) Try to repair truncated JSON
  const repaired = repairTruncatedJson(cleanContent);
  try {
    return JSON.parse(repaired);
  } catch { /* continue */ }

  throw new Error('Unable to parse JSON after all attempts');
}
```

**Change 4: Simplify the detailed prompt**

Reduce the expected output length:
- Summary: 300 words (was 500)
- Articles: Maximum 5 (was 5-10)
- More concise section descriptions

**Change 5: Improve final fallback in `analyzeDocumentWithFileSearch`**

```typescript
// Final fallback: extract partial summary using robust method
console.log('[FileSearch] Using final fallback after parse retries');
const partialSummary = extractSummaryFromPartialJson(lastCleanContent)
  || `Documento de prensa: ${publicationName}`;

return {
  summary: partialSummary.replace(/\\n/g, '\n'),
  clippingsCount: 0,
  categories: [],
  keywords: [],
  relevantClients: []
};
```

---

## Summary of Changes

| Change | Purpose |
|--------|---------|
| Add `repairTruncatedJson` | Close unclosed braces/brackets |
| Add `extractSummaryFromPartialJson` | Robust string extraction with escape handling |
| Update `safeParsePossiblyEmbeddedJson` | Try repair before giving up |
| Simplify prompt | Reduce token usage to avoid truncation |
| Improve fallback | Always return valid response |

---

## Files to Modify

1. `supabase/functions/process-press-pdf-filesearch/index.ts`

