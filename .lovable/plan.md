# TV Speaker ID + Segmentation — Root Cause Fix

## Confirmed from production data

I queried `tv_transcriptions` for the last 3 jobs:

| Job | speaker_id_status | Names visible in UI? | Notes |
|---|---|---|---|
| `c2f3de3f` (latest) | **failed** | ❌ raw `SPEAKER A/B/C/D` | `JSON parse error: Expected ',' or '}' after property value at position 62` |
| `7d494eb6` | **failed** | ❌ raw `SPEAKER A/B/C/D` | Same JSON parse error + **one reporter sentence got split across SPEAKER B, C, D** |
| `30b36325` (older) | **success** | ✅ `SPEAKER A (Dr. Luis Xavier Mayol - Médico…)` | Worked fine before the latest changes |

## Root cause #1 — Stage 3 JSON regex is too greedy/too narrow

In `identifySpeakersFromText` (line 85):
```ts
const jsonMatch = speakerIdResult.data.match(/\{[\s\S]*?\}/);
```
The lazy `*?` stops at the FIRST `}` it sees. Our new prompt asks Qwen for **nested objects** like:
```json
{ "A": {"name": "...", "evidence": "..."}, "B": {...} }
```
So the regex captures only `{ "A": {"name": "...", "evidence": "..."}` — invalid JSON → parse fails → **no names ever applied** → UI shows raw letters. This explains 100% of the missing-names regression.

Additionally, when Qwen embeds a literal quote from the transcript inside `evidence`, that quote often contains unescaped `"` characters — Qwen sometimes emits them raw, also breaking JSON.parse.

## Root cause #2 — `speakers_expected: 4` is forcing over-segmentation

We hard-coded `speakers_expected: 4` in the AssemblyAI request. AssemblyAI docs: this is a **strong hint** — when the actual recording has 1–2 speakers (e.g., one reporter doing a long monologue), the diarizer will *invent* additional speaker boundaries to hit the requested count. That's exactly what we see in `7d494eb6`: a single continuous reporter sentence ("Ante esas circunstancias… reuniéndose en horas… viernes frente a Plaza… Para las noticias les reportó…") got artificially chopped into SPEAKER B, C, D.

The previous pipeline (job `30b36325`) didn't have this hint and segmentation was correct.

---

## Fix Plan (backend-only, ~30 lines, scoped to `process-tv-with-qwen`)

### Phase 1 — Fix Stage 3 JSON extraction (the real "missing names" bug)

In `supabase/functions/process-tv-with-qwen/index.ts` `identifySpeakersFromText`:

**a)** Replace the lazy regex with a balanced-brace extractor that walks the string and counts `{`/`}` (respecting strings/escapes) so it captures the full top-level object even with nested children.

**b)** Wrap `JSON.parse` in a fallback that, on failure:
   - Strips trailing commas
   - Re-escapes obviously-unescaped inner quotes inside `"evidence"` values (heuristic)
   - Retries parsing once

**c)** Switch the prompt to ask for `evidence` as a **short paraphrase (max 6 words, no quotes)** rather than a literal quote. Anti-hallucination still works because we already verify `nameTokenOk` (surname appears in transcript) — the evidence string was always a soft check. This eliminates the unescaped-quote class of JSON errors entirely.

**d)** Use Qwen's structured-output / tool-calling mode (`response_format: { type: "json_object" }`) so the model is forced to emit valid JSON. Qwen-plus supports this on the DashScope compatible endpoint.

### Phase 2 — Fix segmentation (revert the over-eager hint)

In the AssemblyAI request body (line 632):

- **Remove** `speakers_expected: 4`. Let AssemblyAI auto-detect.
- **Keep** `speech_model: 'best'` and `speaker_labels: true` (those genuinely improve quality and were not the regression).
- Optionally add `language_detection: false` (we already pass `language_code: 'es'`) to prevent any auto-detection drift.

This restores the exact diarization behavior that produced the working `30b36325` job.

### Phase 3 — Defensive logging only (no behavior change)

Add one structured log line right after JSON parsing succeeds/fails so future regressions are diagnosable in 1 query:
```
console.log('[qwen-tv][speaker-id-result]', { requestId, parseOk, identifiedCount, mapKeys })
```

### Out of scope (explicitly NOT touched)

- `src/components/radio/enhanced-editor/SpeakerSegment.tsx` — already correct from last pass, format-aware
- `src/utils/tv/speakerTextParser.ts` — already correct
- `useSpeakerLabels`, `formatSpeakerName` — already correct
- Anything under `src/components/radio/**` outside the shared SpeakerSegment file (Radio tab unaffected)
- Anything under Prensa Escrita / Prensa Digital (separate edge functions and UI)

### Files changed

1. `supabase/functions/process-tv-with-qwen/index.ts` — three localized edits inside `identifySpeakersFromText` + remove one line in AssemblyAI body. No changes to chunked path, analysis path, prompts elsewhere, or DB schema.
2. Redeploy `process-tv-with-qwen` (automatic).

### Verification after deploy

1. Upload a fresh short TV clip (single-file path).
2. Query: `SELECT speaker_id_status, speaker_id_error, LEFT(transcription_text, 600) FROM tv_transcriptions ORDER BY created_at DESC LIMIT 1;`
3. Expected: `speaker_id_status = success`, names appended like `SPEAKER A (Name - Role)`, and continuous reporter speech stays under one speaker label.
4. Check edge logs for the new `[speaker-id-result]` line to confirm `parseOk: true`.

### Why this won't break Radio / Prensa

- `process-tv-with-qwen` is invoked **only** from the TV tab (`useTvVideoProcessor`).
- The AssemblyAI body change lives inside this function — Radio uses a separate `transcribe-audio` flow with its own AssemblyAI call.
- No shared util, hook, or component is modified.
- No DB migration.
