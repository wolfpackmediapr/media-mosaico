

# Implementation Plan: Fix TV Timecode Discrepancies & Migrate Gemini Models

## Overview

This plan addresses two critical issues:
1. **Timecode discrepancies** in TV transcriptions (clicking timestamps doesn't seek correctly)
2. **Deprecated Gemini API models** that will stop working (one already shut down)

---

## Part 1: Fix Timecode Discrepancies

### Problem
The current `createUtterancesFromTranscription()` function generates fake timestamps by adding 5 seconds per utterance, causing speaker segments to not sync with actual video positions.

### Solution

#### Change 1: Update Timestamp Normalization
**File:** `src/components/radio/interactive-transcription/utils.ts` (lines 27-34)

**Current code:**
```typescript
export const normalizeTimeToSeconds = (time: number): number => {
  if (time > 1000) {
    return time / 1000;
  }
  return time;
};
```

**New code:**
```typescript
export const normalizeTimeToSeconds = (time: number): number => {
  // If time is clearly in milliseconds (> 10 hours worth of seconds = 36000),
  // then convert to seconds
  if (time > 36000) {
    return time / 1000;
  }
  return time;
};
```

#### Change 2: Update Gemini Prompt to Request Timestamps
**File:** `supabase/functions/process-tv-with-gemini/gemini-unified-processor.ts` (lines 253-258)

**Current code:**
```
FORMATO REQUERIDO (con nombre y rol cuando sea posible):
SPEAKER 1 (Aixa Vázquez - Presentadora): [texto hablado]
SPEAKER 2 (José Rivera - Reportero): [texto hablado]
```

**New code:**
```
FORMATO REQUERIDO (con nombre, rol y MARCA DE TIEMPO cuando sea posible):
SPEAKER 1 (Aixa Vázquez - Presentadora) [00:15]: [texto hablado]
SPEAKER 2 (José Rivera - Reportero) [00:45]: [texto hablado]

IMPORTANTE: Incluye el tiempo aproximado [MM:SS] donde comienza cada intervención.
```

#### Change 3: Parse Timestamps in Utterance Creator
**File:** `supabase/functions/process-tv-with-gemini/gemini-unified-processor.ts` (lines 448-494)

Replace the `createUtterancesFromTranscription` function with a new version that:
- Parses `[MM:SS]` timestamp markers from transcription text
- Falls back to word-count-based estimation when no timestamps available
- Looks ahead to find the next timestamp for accurate end times

```typescript
function createUtterancesFromTranscription(transcription: string): any[] {
  const lines = transcription.split('\n').filter(line => line.trim());
  const utterances: any[] = [];
  let fallbackTime = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Try to parse timestamp format: SPEAKER X (Name) [MM:SS]: text
    const timestampMatch = line.match(/^([^[\]]+?)\s*\[(\d{1,2}):(\d{2})\]:\s*(.*)$/);
    
    if (timestampMatch) {
      const speaker = timestampMatch[1].trim();
      const minutes = parseInt(timestampMatch[2], 10);
      const seconds = parseInt(timestampMatch[3], 10);
      const text = timestampMatch[4].trim();
      
      const startMs = (minutes * 60 + seconds) * 1000;
      
      // Look ahead for next timestamp
      let endMs = startMs + 30000;
      for (let j = i + 1; j < lines.length; j++) {
        const nextMatch = lines[j].match(/\[(\d{1,2}):(\d{2})\]/);
        if (nextMatch) {
          endMs = (parseInt(nextMatch[1], 10) * 60 + parseInt(nextMatch[2], 10)) * 1000;
          break;
        }
      }
      
      utterances.push({ start: startMs, end: endMs, text, confidence: 0.95, speaker });
      fallbackTime = endMs;
    } else {
      // Fallback: word-count based estimation
      const speakerMatch = line.match(/^([^:]+):\s*(.*)$/);
      if (speakerMatch) {
        const wordCount = speakerMatch[2].split(/\s+/).length;
        const estimatedDuration = Math.max(3000, Math.min(wordCount * 400, 15000));
        
        utterances.push({
          start: fallbackTime,
          end: fallbackTime + estimatedDuration,
          text: speakerMatch[2].trim(),
          confidence: 0.75,
          speaker: speakerMatch[1].trim()
        });
        fallbackTime += estimatedDuration;
      }
    }
  }
  
  return utterances.length > 0 ? utterances : [{
    start: 0, end: 60000,
    text: transcription.substring(0, 500) || "Contenido procesado",
    confidence: 0.50, speaker: "Speaker_0"
  }];
}
```

---

## Part 2: Migrate to Supported Gemini Models

### Critical Issue
- `text-embedding-004` was **shut down January 14, 2026** - PDF embeddings may already be failing
- `gemini-2.5-flash` stable will be shut down **June 17, 2026**

### Model Migration Strategy

| Old Model | New Model | Rationale |
|-----------|-----------|-----------|
| `text-embedding-004` | `text-embedding-005` | Direct successor for embeddings |
| `gemini-2.5-flash` | `gemini-2.5-flash-preview-05-20` | Stable preview with extended support |

### Files to Update

#### 1. process-press-pdf/index.ts
**Line 909:** Replace embedding model
```typescript
// OLD:
`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`

// NEW:
`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-005:embedContent?key=${GEMINI_API_KEY}`
```

**Lines 220, 394, 1162:** Replace generative model
```typescript
// OLD:
gemini-2.5-flash

// NEW:
gemini-2.5-flash-preview-05-20
```

#### 2. process-tv-with-gemini/index.ts
**Lines 427, 673, 808, 1044, 1106:** Replace model references
```typescript
// Change all instances of:
gemini-2.5-flash
// To:
gemini-2.5-flash-preview-05-20
```

#### 3. process-tv-with-gemini/gemini-unified-processor.ts
**Line 348:** Replace model
```typescript
gemini-2.5-flash → gemini-2.5-flash-preview-05-20
```

#### 4. process-tv-with-gemini/gemini-client.ts
**Line 184:** Replace model
```typescript
gemini-2.5-flash → gemini-2.5-flash-preview-05-20
```

#### 5. analyze-tv-content/index.ts
**Lines 148, 191:** Replace model
```typescript
gemini-2.5-flash → gemini-2.5-flash-preview-05-20
```

#### 6. process-press-pdf-filesearch/index.ts
**Lines 441, 598:** Replace model
```typescript
gemini-2.5-flash → gemini-2.5-flash-preview-05-20
```

#### 7. search-press-filesearch/index.ts
**Line 95:** Replace model
```typescript
gemini-2.5-flash → gemini-2.5-flash-preview-05-20
```

#### 8. reanalyze-articles/index.ts (Lovable AI Gateway)
**Line 113:** Replace model
```typescript
// OLD:
model: 'google/gemini-2.5-flash'

// NEW:
model: 'google/gemini-2.5-flash-preview-05-20'
```

#### 9. process-rss-feed/index.ts (Lovable AI Gateway)
**Line 527:** Replace model
```typescript
// OLD:
model: 'google/gemini-2.5-flash'

// NEW:
model: 'google/gemini-2.5-flash-preview-05-20'
```

---

## Summary of Changes

| File | Type of Change |
|------|----------------|
| `src/components/radio/interactive-transcription/utils.ts` | Fix timestamp normalization threshold |
| `supabase/functions/process-tv-with-gemini/gemini-unified-processor.ts` | Add timestamp prompt + parse timestamps + update model |
| `supabase/functions/process-tv-with-gemini/index.ts` | Update 5 model references |
| `supabase/functions/process-tv-with-gemini/gemini-client.ts` | Update 1 model reference |
| `supabase/functions/analyze-tv-content/index.ts` | Update 2 model references |
| `supabase/functions/process-press-pdf/index.ts` | Update embedding model + 3 generative model refs |
| `supabase/functions/process-press-pdf-filesearch/index.ts` | Update 2 model references |
| `supabase/functions/search-press-filesearch/index.ts` | Update 1 model reference |
| `supabase/functions/reanalyze-articles/index.ts` | Update 1 Lovable AI Gateway model |
| `supabase/functions/process-rss-feed/index.ts` | Update 1 Lovable AI Gateway model |

**Total: 10 files, ~20 model reference updates**

---

## Testing Plan

1. **Timecode Testing:**
   - Upload a new TV video and process it
   - Verify transcription contains `[MM:SS]` timestamps
   - Click on speaker utterances and confirm video seeks correctly

2. **Model Migration Testing:**
   - Process a press PDF to verify embeddings work with `text-embedding-005`
   - Process a TV video to verify `gemini-2.5-flash-preview-05-20` works
   - Check RSS feed processing completes without 404/410 errors
   - Monitor edge function logs for any model-related errors

3. **Regression Testing:**
   - Verify Radio transcription still works unchanged
   - Verify Prensa Escrita PDF processing completes
   - Verify existing TV transcriptions display correctly

