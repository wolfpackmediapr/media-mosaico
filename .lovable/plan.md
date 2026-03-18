

## Fix: Chunked Upload Path Missing Null Guards

### Root Cause

The crash chain in the logs:
1. All 5 analysis attempts get `blockReason: "OTHER"` (TPM exceeded) — `analysisResult` stays `null`
2. The loop throws on attempt 5, but the `continue` on 429 retry (attempt 5) causes the loop to exit with `analysisResult = null`
3. `extractTranscriptionFromAnalysis(null)` is called — the null guard returns `''`, but `.trim()` was called before the guard existed in deployed code
4. The catch block at **line 957** does `analysisResult.substring(0, 1000)` on `null` — **second crash point**

The fix we applied to the *assembled video* path (lines 1238-1242) was never applied to the *chunked upload* path (lines 940-958).

### Changes

#### File: `supabase/functions/process-tv-with-gemini/index.ts`

**1. Add null guard after chunked upload analysis loop (after line 940)**

Add the same guard that exists at line 1238:
```typescript
// After the analysis loop ends (line 940)
if (!analysisResult) {
  console.error('[gemini-unified] All analysis attempts failed in chunked path - analysisResult is null');
  throw new Error('Analysis failed: all attempts returned no results. Content may have been blocked by Gemini.');
}
```

**2. Fix the catch block fallback at line 957**

The fallback `analysisResult.substring(0, 1000)` will crash if `analysisResult` is null. Change to:
```typescript
finalTranscription = `SPEAKER 1: ${(analysisResult || '').substring(0, 1000).trim()}`;
```

**3. Add blockReason logging in chunked path (line 906-908)**

Currently it just logs "No candidates" without checking `promptFeedback.blockReason`. Update to:
```typescript
if (!analysisData.candidates || analysisData.candidates.length === 0) {
  const blockReason = analysisData.promptFeedback?.blockReason;
  console.error('[gemini-unified] No candidates in analysis response:', JSON.stringify(analysisData).substring(0, 500));
  if (blockReason) {
    console.error(`[gemini-unified] Content blocked by Gemini: ${blockReason}`, analysisData.promptFeedback);
    throw new Error(`Content blocked by Gemini: ${blockReason}`);
  }
  throw new Error('No analysis response from Gemini');
}
```

**4. Same blockReason check for transcription path (line 740)**

Add a check before the candidate text extraction: if no candidates and there's a `blockReason`, log it and handle gracefully instead of silently skipping.

### After code changes

Redeploy the `process-tv-with-gemini` edge function so the fixes take effect in production.

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/process-tv-with-gemini/index.ts` | Add null guard after chunked analysis loop, fix fallback `.substring()` on null, add blockReason logging in both transcription and analysis paths |

