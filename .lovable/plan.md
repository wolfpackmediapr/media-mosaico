

## Fix: AssemblyAI 400 Error — Unsupported Features for Spanish

### Root Cause
AssemblyAI returns HTTP 400: `"The following models are not available in this language: auto_chapters, auto_highlights"`. These features are English-only in AssemblyAI but the code requests them with `language_code: 'es'`.

### Fix
In `supabase/functions/process-tv-with-qwen/index.ts`, lines 352-359, remove `auto_chapters` and `auto_highlights` from the AssemblyAI transcription request. Keep `speaker_labels` and `entity_detection` which are supported for Spanish.

```typescript
// Before
body: JSON.stringify({
  audio_url: uploadUrl,
  language_code: 'es',
  speaker_labels: true,
  auto_chapters: true,       // ← NOT available for Spanish
  entity_detection: true,
  auto_highlights: true,     // ← NOT available for Spanish
}),

// After
body: JSON.stringify({
  audio_url: uploadUrl,
  language_code: 'es',
  speaker_labels: true,
  entity_detection: true,
}),
```

### Scope
- **One file**: `supabase/functions/process-tv-with-qwen/index.ts` (2 lines removed)
- **Redeploy** the edge function
- No radio, UI, or other changes

### Why this is safe
The chapters and highlights features were never actually used downstream — the Qwen text-analysis step handles all summarization and keyword extraction via the master prompt. These were redundant AssemblyAI features that happen to not support Spanish.

