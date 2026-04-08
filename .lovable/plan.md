

## Dual Gemini API Key Rotation

### Summary
Add a key manager to `process-tv-with-gemini` that tries the primary key first, rotates to the secondary on 429, and tracks which key was used in the database.

### Database Migration

Add two columns to `tv_transcriptions`:
```sql
ALTER TABLE tv_transcriptions 
ADD COLUMN IF NOT EXISTS provider_used TEXT,
ADD COLUMN IF NOT EXISTS provider_fallback_reason TEXT;
```

### Code Changes

**File: `supabase/functions/process-tv-with-gemini/index.ts`**

**A. Add key manager after imports (after line 8):**

```typescript
const GEMINI_KEYS = [
  Deno.env.get('GOOGLE_GEMINI_API_KEY_TV'),
  Deno.env.get('GOOGLE_GEMINI_API_KEY_TV_2')
].filter(Boolean) as string[];

let currentKeyIndex = 0;
let rotationCount = 0;
const MAX_ROTATIONS = 1;

function getApiKey(): string {
  return GEMINI_KEYS[currentKeyIndex % GEMINI_KEYS.length];
}

function getKeyLabel(): string {
  return currentKeyIndex === 0 ? 'gemini-primary' : 'gemini-secondary';
}

function rotateKey(reason: string): boolean {
  if (GEMINI_KEYS.length < 2) return false;
  if (rotationCount >= MAX_ROTATIONS) return false;
  const prev = currentKeyIndex;
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
  rotationCount++;
  console.warn(`[gemini-unified] Rotated from key ${prev} to ${currentKeyIndex}: ${reason}`);
  return true;
}

function resetRotationState(): void {
  currentKeyIndex = 0;
  rotationCount = 0;
}
```

**B. Add `resetRotationState()` at the very start of the `serve()` handler** (before any processing), so each request starts fresh.

**C. Replace all 10 hardcoded `Deno.env.get('GOOGLE_GEMINI_API_KEY_TV')` calls with `getApiKey()`:**

| Location | Line | Context |
|---|---|---|
| `uploadVideoToGemini()` | 144 | Local var assignment |
| `uploadVideoToGeminiStream()` | 233 | Local var assignment |
| `cleanupGeminiFile()` | 383 | Local var assignment |
| `generateComprehensiveAnalysis()` | 442 | Local var assignment |
| Transcription fetch (chunked path) | 704 | Inline in URL |
| Analysis fetch (chunked path) | 851 | Inline in URL |
| Transcription fetch (direct path) | 1158 | Inline in URL |
| Analysis fetch (direct path) | 1220 | Inline in URL |
| Environment validation | 2123 | Startup check |

For lines 704, 851, 1158, 1220 — change from inline `Deno.env.get(...)` to `getApiKey()`.

For lines 144, 233, 383, 442 — remove local `geminiApiKey` var and null check, use `getApiKey()` directly (the key manager already guarantees a valid key since env validation happens at startup).

For line 2123 — change validation to check `GEMINI_KEYS.length >= 1` and log count of available keys.

**D. Add rotation logic to 429 retry blocks:**

There are 4 places with 429 handling (lines 729, 897, 259, and the direct-path equivalents). In each, after exhausting retries on one key:

```typescript
// After max retries on current key hit 429:
if (rotateKey('429_rate_limit_exhausted')) {
  attempt = 0; // Reset retry counter for new key
  continue;
}
throw new Error('Both API keys rate limited. Try again in 60 seconds.');
```

**E. Update `environment.ts`** to validate at least one key exists (not specifically `GOOGLE_GEMINI_API_KEY_TV`), and return the first available key.

**F. Add provider tracking to database writes:**

At every point where `tv_transcriptions` is updated with `status: 'completed'`, add:
```typescript
provider_used: getKeyLabel(),
provider_fallback_reason: rotationCount > 0 ? '429_rate_limit_exhausted' : null,
```

**G. Add per-request summary log** at end of processing:
```typescript
console.log(`[gemini-unified] Request complete: provider=${getKeyLabel()}, rotations=${rotationCount}`);
```

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/process-tv-with-gemini/index.ts` | Key manager, replace 10 lookups, rotation on 429, provider tracking, per-request logging |
| `supabase/functions/process-tv-with-gemini/environment.ts` | Validate at least 1 key exists, log key count |
| DB migration | Add `provider_used` and `provider_fallback_reason` columns |

### Behavior

```text
Request arrives → resetRotationState()
  → Try primary key (KEY_TV)
    → Success → provider_used: 'gemini-primary'
    → 429 after retries → rotateKey()
      → Try secondary key (KEY_TV_2)
        → Success → provider_used: 'gemini-secondary', reason: '429_rate_limit_exhausted'
        → 429 again → fail: "Both API keys rate limited"
```

