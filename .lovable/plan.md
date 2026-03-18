

## Revised Plan: Fix TV Processing Crash + Reduce TPM Usage

### Problem

1. **TPM over limit**: Gemini 2.5 Flash shows 1.31M/1M TPM usage. The large `maxOutputTokens` values (32,768 and 16,384) count toward TPM even when not fully used, and large video inputs (263K tokens for a single video) consume most of the budget.
2. **Null crash**: When Gemini blocks/refuses a request, `analysisResult` stays `null` and the code crashes on `.trim()`.

### Changes

#### 1. Roll back token limits to conservative values
**File:** `supabase/functions/process-tv-with-gemini/index.ts`
- Transcription `maxOutputTokens`: 32,768 → **16,384**
- Analysis `maxOutputTokens`: 16,384 → **8,192**
- These apply to all call sites (lines ~689, ~836, ~1105, ~1178)

**File:** `supabase/functions/process-tv-with-gemini/gemini-unified-processor.ts`
- Analysis `maxOutputTokens`: 16,384 → **8,192**

**File:** `supabase/functions/process-tv-with-gemini/gemini-client.ts`
- Already at 8,192 — no change needed

#### 2. Fix null crash after blocked/failed analysis
**File:** `supabase/functions/process-tv-with-gemini/index.ts`
- After analysis retry loop: throw descriptive error if `analysisResult` is still null
- In `extractTranscriptionFromAnalysis`: add `if (!analysis) return '';` guard
- Log `promptFeedback.blockReason` when Gemini returns no candidates

#### 3. Add inter-request delay to spread TPM usage
**File:** `supabase/functions/process-tv-with-gemini/index.ts`
- Increase delay between transcription and analysis calls from 1s → **5s** to avoid TPM spikes within the same minute window

### Technical Details

The Gemini API counts both input and output tokens toward the TPM limit. A single video can consume 200K-300K input tokens. With the current output limits (32K + 16K), a single processing run uses ~300K+ tokens — meaning only ~3 videos can process per minute before hitting the 1M TPM ceiling.

Rolling back to 16K + 8K output tokens and adding a 5s delay between calls reduces per-run TPM pressure by ~24K tokens and spreads usage across minute boundaries.

```text
Current per-run token budget:
  Input:  ~263K (video) + ~1K (prompt) × 2 calls = ~528K
  Output: 32K + 16K = 48K max
  Total:  ~576K per video run

Revised per-run token budget:
  Input:  ~263K (video) + ~1K (prompt) × 2 calls = ~528K
  Output: 16K + 8K = 24K max
  Total:  ~552K per video run
```

The main saving comes from the 5s delay ensuring the two calls don't land in the same TPM minute window.

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/process-tv-with-gemini/index.ts` | Roll back maxOutputTokens, add null guards, add block-reason logging, increase inter-call delay |
| `supabase/functions/process-tv-with-gemini/gemini-unified-processor.ts` | Roll back maxOutputTokens to 8,192 |

