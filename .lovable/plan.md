# Plan: Fix TV Transcription UI colors + Speaker-ID hallucinations

## Root causes (confirmed via DB + code)

**1. UI lost its colors / speaker label is broken**
The `enhanced-editor/SpeakerSegment.tsx` (used by both Radio and TV in *edit* view) was written for the old `"speaker_1"` format. With the new canonical TV ID `"A|Name|Role"`:
- `parseInt(speakerNum) * 60` → `NaN` → no border color, no dot color.
- `displayName` becomes literally `SPEAKER A|Name|Role`.
- It also sidelines the rich `getDisplayName()` helper we already added.

**2. Names are hallucinated**
Latest DB row (`30b36325…`) shows `SPEAKER A (Dr. Luis Xavier Mayol - Médico especialista en obesidad…)` attached to dialog about **truckers and government persecution** — nothing to do with that doctor. Cause: the Stage-3 Qwen text prompt **lists 13 famous PR personalities** ("Silverio Pérez, Ada Monzón, Normando Valentín…") and instructs the model to match. With no grounding it picks plausible names from that list. We also never re-show the on-screen-graphics evidence.

**3. No vision evidence for speaker ID**
Earlier we removed the broken `qwen-vl-max` video call (it never worked). We replaced it with text-only, but for TV the *real* signal is on-screen lower-third graphics ("María Rivera | Reportera"). We should reintroduce vision — but the right way: extract a few **frames** (still images) from the chunked video and feed them to `qwen-vl-max` (which IS image-capable). This grounds the names instead of guessing.

---

## Scope guarantees (what will NOT change)

- ❌ No edits to any file under `src/components/radio/**` outside the one shared `enhanced-editor/SpeakerSegment.tsx` — and that change is **fully backward compatible** with the old `"speaker_1"`, `"speaker_2"` format that Radio uses (verified by branching on the presence of `|` and falling back to existing logic).
- ❌ No edits to `src/components/prensa-*` or any Prensa Escrita/Digital files.
- ❌ No edits to `useSpeakerLabels`, `SpeakerLegend`, `interactive-transcription/SpeakerSegment` beyond what was already shipped (they are already correct).
- ❌ No DB schema changes.
- ❌ AssemblyAI parameters stay as-is (`speech_model: 'best'`, `speakers_expected: 4`).

---

## Phase 1 — Restore colorful UI (high impact, low risk)

**File: `src/components/radio/enhanced-editor/SpeakerSegment.tsx`** (single shared component)

Make it format-aware so it works for **both** Radio (`"speaker_1"`, `"1"`, `"A"`) and TV (`"A"`, `"A|Name|Role"`):

- Parse `speaker` into `{ letterOrNum, name?, role? }` by splitting on `|`.
- Color seed: if first token is a letter, use its char code; if numeric, use the number; if `speaker_N`, use N. (Reuse the same algorithm already present in `interactive-transcription/utils.ts → getSpeakerColor`.)
- Display name resolution order:
  1. Custom user label from `getDisplayName(speaker)` (unchanged).
  2. If TV piped format → render `Name (Role)`.
  3. If single uppercase letter → `Hablante A`.
  4. Else fallback to existing `SPEAKER X`.
- Use `hsl(...)` palette (same as the interactive view) so colors match the dot in the toggle/legend.

Result: edit view in TV gets the dot + colored left border + clean `María Rivera (Reportera)` label, identical visual language to Radio.

## Phase 2 — Stop name hallucinations (backend, TV-only)

**File: `supabase/functions/process-tv-with-qwen/index.ts`** — modify `identifySpeakersFromText`:

1. **Remove the hardcoded personality list** from the prompt. It biases the model toward a closed set of names regardless of evidence.
2. **Tighten the prompt**: only return a name if there is **explicit textual evidence** (self-introduction or being addressed by name in the dialog). Otherwise return only a role descriptor in Spanish ("Reportero en campo", "Presentadora", "Invitado", etc.). Add an explicit instruction: *"Si no hay evidencia textual directa, NO inventes un nombre. Devuelve solo el rol."*
3. **Lower temperature** for the speaker-id call to ~0.1 (already supported by `callQwenStreaming`; pass through).
4. **Per-speaker evidence requirement**: require the JSON response to include `{"A": {"name": "...", "role": "...", "evidence": "<exact quote from transcript>"}}`. Reject any entry whose `evidence` substring is not actually present in the transcript text — drop those before applying the rename. This is the key anti-hallucination guard.
5. Keep `speaker_id_status / method / error` writes intact.

## Phase 3 — Add real vision grounding (Stage 3b, optional, TV-only)

**File: `supabase/functions/process-tv-with-qwen/index.ts`** — only the chunked path:

1. After AssemblyAI returns utterances, pick up to **6 frame timestamps** spread across the broadcast (one per ~3 min), using `ffmpeg`-equivalent extraction is not available in Edge runtime, so instead:
   - Use the already-stored chunked file's first chunk header + Supabase Storage `transform=` query if available, OR
   - Skip silently if frame extraction is not feasible — Phase 2 already removes hallucinations.
2. If frames are obtainable, send them to `qwen-vl-max` (which IS image-capable) with the prompt: *"Lee los gráficos de identificación en pantalla (chyrons / lower-thirds) y devuelve cada Nombre — Rol observado."*
3. Merge vision results into the speaker map **only when** they corroborate text evidence from Phase 2; otherwise vision wins for naming, text wins for which speaker letter.

> Phase 3 is gated: if frame extraction proves infeasible in this Edge runtime, we ship Phases 1+2 and document Phase 3 as future work. Phases 1+2 alone already eliminate the visible bug.

## Phase 4 — Verify & QA

- Read the most recent `tv_transcriptions` row after a fresh upload via SQL.
- Confirm `speaker_id_status = success` and that any `(Name - Role)` annotations have a matching evidence quote in `transcription_text`.
- Visually confirm in `/tv` that:
  - Speaker dots and colored left borders are back.
  - Labels show `Hablante A` for unidentified or `María Rivera (Reportera)` for identified.
  - No more "Dr. Luis Xavier Mayol" attached to trucker dialogue.

---

## Files touched

| File | Change | Risk |
|---|---|---|
| `src/components/radio/enhanced-editor/SpeakerSegment.tsx` | Format-aware color + label | Low — backward compatible with Radio's `speaker_N` format |
| `supabase/functions/process-tv-with-qwen/index.ts` | Drop personality list, add evidence-required JSON, lower temp, optional Phase 3 vision | Low — TV pipeline only |

No other files changed. Radio, Prensa Escrita, Prensa Digital, dashboard, social — untouched.

---

## Execution order

1. Phase 1 (UI fix) — restores colors immediately for any past or future TV transcription.
2. Phase 2 (anti-hallucination) — applies to all new TV uploads.
3. Phase 3 attempted; if blocked, documented and skipped.
4. Phase 4 verification on a live upload.

Approve and I'll execute Phases 1 → 2 → (try 3) → 4 in one pass.
