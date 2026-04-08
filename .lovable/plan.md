

## Fix: Pin API Key After Upload

### Problem

Gemini Files API scopes files to the API key that uploaded them. The current per-stage rotation resets `currentKeyIndex` between upload → transcription → analysis. If the upload rotated to Key 2, but the reset sends transcription back to Key 1, Key 1 gets 403 PERMISSION_DENIED because it doesn't own the file.

Log evidence:
- Upload rotated from Key 1 (`AIza...5avE`) to Key 2 (`AIza...Zvho`) due to 429
- File `y82o1015rblp` uploaded successfully under Key 2
- Transcription and analysis both fail with 403 on Key 2 (all 5 attempts) — the file reference is cross-key

### Fix

**File: `supabase/functions/process-tv-with-gemini/index.ts`**

1. **Add a "pinned key" concept to the key manager**

After a successful file upload, pin the key index so all subsequent stages use the same key that owns the file.

```typescript
let pinnedKeyIndex: number | null = null;

function pinCurrentKey() {
  pinnedKeyIndex = currentKeyIndex;
  console.log(`[gemini-unified] Pinned to key ${currentKeyIndex} (${getMaskedKey()}) for file ownership`);
}

function getApiKey(): string {
  if (pinnedKeyIndex !== null) return GEMINI_KEYS[pinnedKeyIndex];
  return GEMINI_KEYS[currentKeyIndex];
}
```

2. **Pin the key right after file upload succeeds** (both upload paths)

After `uploadVideoToGemini()` and `uploadVideoToGeminiStream()` return successfully, call `pinCurrentKey()`.

3. **Change `resetRotationState()` to NOT reset `currentKeyIndex` when pinned**

The reset should only clear `rotationCount` so the stage can still attempt rotation if needed, but it should not move away from the pinned key. If a 429 forces rotation during transcription/analysis, that rotation should be blocked (since the other key can't access the file anyway).

4. **Update rotation logic for post-upload stages**

When `pinnedKeyIndex !== null`, `rotateKey()` should return `false` and log a warning: "Cannot rotate — file is pinned to this key." The correct behavior on 429 post-upload is to wait longer, not switch keys.

5. **Reset pinned key at request start**

In `resetRotationState()` at request entry, also reset `pinnedKeyIndex = null`.

6. **Increase backoff for post-upload 429s**

Since key rotation is no longer available after upload, increase the backoff delays for transcription and analysis 429s to give the quota time to recover (e.g., 15s, 30s, 60s, 90s, 120s across 5 attempts).

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/process-tv-with-gemini/index.ts` | Add `pinnedKeyIndex`, `pinCurrentKey()`, update `getApiKey()`, `rotateKey()`, `resetRotationState()`, and backoff delays |

### Behavior After Fix

```text
Request arrives → resetRotationState() (clears pin + rotation count)
  Upload stage:
    Key 1 → 429 → rotate to Key 2 → success
    pinCurrentKey() → locked to Key 2
  
  Transcription stage:
    resetRotationState() clears rotation count but keeps pin
    Always uses Key 2 (file owner)
    429 → longer backoff (no rotation possible)
  
  Analysis stage:
    resetRotationState() clears rotation count but keeps pin  
    Always uses Key 2 (file owner)
    429 → longer backoff (no rotation possible)
```

### What this does NOT fix

If both keys are heavily rate-limited simultaneously, the longer backoff helps but can still fail. The real fix for sustained throughput remains Tier 2 upgrade.

