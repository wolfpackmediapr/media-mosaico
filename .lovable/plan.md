# TV Transcription Fix — UI Doubling + JSON Hardening

## What's actually broken (confirmed in DB)

| Job | Stage 3 status | What's in DB | What UI shows |
|---|---|---|---|
| `4cfb17d3` (latest) | ✅ success | `[00:00] SPEAKER A (Bexaida - Invitada): Nosotros…` | ❌ `SPEAKER A: SPEAKER A\|Bexaida\|Invitada: Nosotros…` |
| `c2f3de3f` | ❌ failed (JSON pos 62) | raw `SPEAKER A/B/C/D` | raw letters |
| `7d494eb6` | ❌ failed (JSON pos 113) | raw `SPEAKER A/B/C/D` | raw letters |

**So there are TWO independent bugs**, and the latest job proves the backend pipeline *can* identify names correctly when JSON parses — the UI is just mangling perfectly good output.

## Answer to your direct question

**Yes**, AssemblyAI and Qwen work in concert:
- **AssemblyAI** = diarization (when does speaker A stop, B start). Working.
- **Qwen-plus (text-only)** = identification (A → "Bexaida", B → "Presentadora") from dialogue cues like "Licenciada Bexaida…". Working *when* JSON parses.
- **Computer vision** (reading on-screen lower-thirds) is **NOT** wired in — Edge runtime has no ffmpeg to extract keyframes. Names come from textual cues only.

---

## Fix Plan — 2 surgical edits, TV-only

### Phase 1 — Fix the UI double-prefix (the visible bug in your screenshot)

**File:** `src/utils/tv/speakerTextParser.ts`

Replace the single-regex parser with a two-step tokenizer that handles the real wire format:

```
[00:00] SPEAKER A (Bexaida - Invitada): text…
[00:26] SPEAKER B (Presentador/a): text…
```

- **Step 1:** Strip optional `[mm:ss]` timestamp prefix and capture it as `start` ms (instead of fake 5 s increments — bonus: real timestamps for click-to-seek).
- **Step 2:** Match `^SPEAKER\s+(\w+)(?:\s*\(([^)]+)\))?:\s*` once per line/block. Use `\(([^)]+)\)` (already correct) but anchor matching to **line starts** so the lookahead doesn't bleed.
- **Step 3:** Build `speaker` field as `LETTER|Name|Role` exactly once. Renderer (`SpeakerSegment.tsx`) already handles that format correctly — no UI changes needed.

**Why this is safe:** the file is only imported by TV components (`useTvTranscriptionEditor`, `TvTranscriptionSection`). Confirmed via grep — Radio uses a separate `parseTimestampedText` util.

### Phase 2 — Harden Stage 3 JSON parsing (the intermittent backend bug)

**File:** `supabase/functions/process-tv-with-qwen/index.ts`, function `identifySpeakersFromText`

The current `safeJsonParse` strips trailing commas but doesn't fix the real cause: **unescaped apostrophes/quotes inside string values** ("McDonald's", `el "evento"`).

Three layered defenses:

1. **Move evidence out of free text into a controlled field.** Change the prompt schema to ask for `evidence_keyword` (single word, max 30 chars, no quotes/apostrophes) instead of a paraphrase. The validation logic in lines 175–190 only needs the keyword to appear in the transcript — it never used the full paraphrase semantically.
2. **Add a JSON repair fallback** that detects unescaped inner quotes (heuristic: a `"` inside a value position not followed by `,`/`}`/`:`) and escapes them, then retries `JSON.parse`.
3. **If parsing still fails after both repairs**, fall back to a regex extractor that pulls `"A": {"name": "X", "role": "Y"}` pairs one-by-one — partial recovery > total failure.

Also: add `temperature: 0.1` and `top_p: 0.8` to the Qwen call to reduce stylistic variation in the JSON output (currently temperature defaults to ~0.7).

### Phase 3 — Verification

After deploy, upload one short TV clip and run:

```sql
SELECT speaker_id_status, speaker_id_error,
       LEFT(transcription_text, 400)
FROM tv_transcriptions
ORDER BY created_at DESC LIMIT 1;
```

Expected:
- `speaker_id_status = success`
- DB text starts with `[00:00] SPEAKER A (Name - Role): …`
- UI Edit tab shows **`Name (Role)`** with colored dot — no doubled prefix, no `|` pipes visible.

---

## Out of scope (explicitly NOT touched)

- ❌ `src/components/radio/**` — Radio uses its own `parseTimestampedText`
- ❌ `src/components/radio/enhanced-editor/SpeakerSegment.tsx` — already format-aware from last pass, works fine once parser emits clean IDs
- ❌ Prensa Escrita / Prensa Digital — separate edge functions and UI
- ❌ AssemblyAI parameters — diarization is currently correct (the latest job split Bexaida vs Presentador correctly)
- ❌ DB schema — no migration
- ❌ Vision/keyframe extraction — Edge runtime can't run ffmpeg; deferred

## Files changed

1. `src/utils/tv/speakerTextParser.ts` — rewrite parser (TV only)
2. `supabase/functions/process-tv-with-qwen/index.ts` — prompt schema + JSON repair in `identifySpeakersFromText`

Both deployed in one pass.
