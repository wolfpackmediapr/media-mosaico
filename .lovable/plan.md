# TV pipeline fix: per-story analysis + real Qwen-VL speaker ID + stop video disappearing

## The three problems (all observed today)

### A. Video disappears mid-processing (NOT a real reload)
Session-replay timeline:
```
T+0     "¡Procesamiento completado!" toast + transcription textarea appears
T+3s    "Guardando..." → "Guardado exitoso"
T+43s   "No hay videos subidos"   ← video card GONE
```
Console log right before it disappears: `[usePersistentVideoState] Serialized 0 files`.

This is **not** a page reload — the React tree stays mounted. What's happening: a side-effect downstream of the autosave + transcription success is calling `setUploadedFiles([])`, which the persistent-state hook then serializes to sessionStorage as `[]`. The video element unmounts. Meanwhile the background Edge Function (`process-tv-with-qwen`) keeps running on the server because analysis was already decoupled via `EdgeRuntime.waitUntil` last turn — that's why transcription text still arrives, but the user sees the video card vanish, and analysis sometimes fails silently because the UI no longer has a card to surface the error on.

### B. Analysis lost the rich per-story format
`Analisis_Example.docx.md` shows what we need: per-story `[NOTICIA N]` blocks (Título / Resumen / Participantes / Temas / Tono / Categorías / 5W / Palabras clave / Puntuación de impacto) INSIDE the existing two-color structure (`[TIPO DE CONTENIDO: PROGRAMA REGULAR]` blue card + `[TIPO DE CONTENIDO: ANUNCIO PUBLICITARIO]` yellow card). The renderer already produces colored cards correctly; the prompts in `analyze-tv-stored` and `analyze-tv-content` were stripped and no longer emit either marker.

### C. Visual speaker ID is fake
`process-tv-with-qwen` lines 761–767 admit it: the previous vision attempt sent raw 15MB byte chunks to `qwen-vl-max` and always failed because that model takes images, not raw video. Current implementation is **text-only dialogue inference** — real names from on-screen lower-thirds (e.g., "José Torres Ruiz - Inspector CIC Guayama") are NEVER extracted. The prompt still claims to read chyrons, but the code doesn't.

## Fix — all Qwen, no Gemini expansion

### Section 1: Stop the video card from disappearing during processing

`src/hooks/tv/usePersistentVideoState.ts`:

1. Guard `setUploadedFiles` so it refuses to serialize an empty array while `isProcessing === true` OR while a `transcriptionId` exists without a terminal `failed:*` status. Concretely: when the wrapper (line 133) receives `[]`, check for an in-flight job (read from a small ref shared via context or the existing `useTvVideoProcessor` state) and short-circuit the write. The blob URL + filePath stay intact.
2. The deserialize path (line 84–128) already prefers cached blob URL → filePath (Supabase URL) → stored preview — keep that. Just make sure we never *write* `[]` mid-job in the first place.
3. Add a `clearUploadedFiles({ force: boolean })` helper that explicit user actions (e.g., the "Clear" button via `useTvClearState`) call with `force: true`. All other code paths use the guarded setter.
4. Track which side-effect is currently zeroing the array — based on the timing (~40s after autosave finishes, before analysis completes) it's most likely a stale closure inside the autosave/onSuccess chain or a `forceReset` toggle. Add a one-line `console.warn` in the guarded setter when a write is rejected so future regressions are obvious.

This single fix solves the "video disappears" symptom AND the downstream "analysis sometimes fails silently" symptom (because the UI keeps the file card, and the existing failure-state UI from last turn's plan can render properly).

### Section 2: Real visual speaker ID via Qwen-VL frame list

Qwen-VL natively accepts an "image list" of up to 256 pre-extracted frames per request with an `fps` parameter — exactly what Alibaba documents for video understanding. CloudConvert is already integrated (`CLOUDCONVERT_API_KEY` set, used by `compress-tv-video` / `convert-video` / `convert-to-audio`) and supports ffmpeg-based JPG keyframe extraction natively.

#### NEW edge function: `extract-tv-frames`
- Input: `{ videoPath, transcriptionId }`
- CloudConvert ffmpeg job: extract 1 JPG every 5 seconds (covers 3–8s lower-third display windows) for the first 30 minutes, capped at **120 frames** (well under Qwen's 256 cap).
- Each frame downscaled to 720x480 (sufficient for chyron OCR, keeps tokens low).
- Frames written to existing `videos` bucket under `tv-frames/<transcriptionId>/frame_0001.jpg ... frame_0120.jpg`.
- Returns `{ frames: [{ url, ts_seconds }], fps_extracted: 0.2 }`.
- Auto-cleanup: delete frames after analysis finishes (or 24h via lifecycle).

#### NEW stage in `process-tv-with-qwen`: `visualSpeakerId`
After AssemblyAI transcription gives us SPEAKER A/B/C/... letters with timestamps, BEFORE the existing text-only fallback:
1. Call `extract-tv-frames`.
2. POST to Qwen-VL via DashScope `/compatible-mode/v1/chat/completions` with `model: qwen-vl-max-latest`, content array = all frame URLs as `image_url` items + a system prompt asking it to OCR every chyron / lower-third / banner / network logo and return JSON:
   ```json
   {"graphics":[
     {"ts_seconds":42.5,"name":"José Torres Ruiz","role":"Inspector CIC Guayama","outlet":"Telemundo PR"},
     {"ts_seconds":187.0,"name":"Walter Soto León","role":"Presentador","outlet":"Telenoticias 11"}
   ]}
   ```
3. Use AssemblyAI utterance timestamps to map each `ts_seconds` to whichever SPEAKER letter was talking at that moment (±10s window).
4. Build `speakerMap = { A: "Walter Soto León - Presentador", B: "José Torres Ruiz - Inspector CIC Guayama", ... }`.
5. **Merge with text-only Qwen-Plus fallback** for letters vision missed (off-screen voices, callers, voice-over).
6. Apply existing `sanitizeSpeakerMap()` — only commit a name if it came from OCR'd graphic OR explicit dialogue mention.
7. Replace `SPEAKER A` → `SPEAKER A (José Torres Ruiz - Inspector CIC Guayama)` in transcription text.
8. Persist evidence trail in DB column `speaker_id_evidence jsonb` (which letter, what frame, what OCR text) for QA.

#### DB migration (additive)
```sql
ALTER TABLE tv_transcriptions ADD COLUMN IF NOT EXISTS speaker_id_evidence jsonb;
```
Existing `speaker_id_method` column gets new values: `vision+text` | `vision-only` | `text-only` | `none`.

#### Cost
~120 frames × 720×480 ≈ ~18k visual tokens to qwen-vl-max-latest, well within per-request limits, roughly equivalent to one extra `qwen-plus` analysis call per video.

### Section 3: Restore per-story `[NOTICIA N]` analysis format

#### NEW shared module: `supabase/functions/_shared/tvAnalysisPrompt.ts`
Move the existing `buildAnalysisPrompt` body from `process-tv-with-qwen` (lines 148–290) into a shared file. It already has both `[TIPO DE CONTENIDO:]` markers AND per-story `[NOTICIA N]` blocks with all 9 fields, plus anti-blending / anti-hallucination / client-relevance rules.

#### Update `analyze-tv-stored/index.ts`
Replace its stripped inline prompt with `import { buildTvAnalysisPrompt } from '../_shared/tvAnalysisPrompt.ts'`. Keep streaming + fallback + extractor.

#### Update `process-tv-with-qwen/index.ts`
Same import. Removes duplication.

#### Update `analyze-tv-content/tvPromptBuilder.ts` (Gemini fallback path)
Rewrite to emit the same `[TIPO DE CONTENIDO:]` + `[NOTICIA N]` text format (drop the JSON schema). Drop `responseMimeType: "application/json"` from the Gemini call. Used only when Qwen fully fails — small but safety net stays consistent.

### Section 4: Backfill historical jobs
After deploy, invoke `analyze-tv-stored` once per affected ID:
`fa98999e`, `4f3ff24e`, `e674eb8c`, `90e55a41`, `65511dcb`, `983a9cb3`, `2a5d43d3`, `0e1d5422`.
Vision frames may not exist for old videos → these get text-only speaker ID + per-story analysis. New uploads get full vision.

## Files changed

```text
NEW   supabase/functions/_shared/tvAnalysisPrompt.ts
NEW   supabase/functions/extract-tv-frames/index.ts
EDIT  supabase/functions/process-tv-with-qwen/index.ts
        - import shared prompt
        - new visualSpeakerId stage between transcription and text-only fallback
EDIT  supabase/functions/analyze-tv-stored/index.ts          (import shared prompt)
EDIT  supabase/functions/analyze-tv-content/tvPromptBuilder.ts (per-story text format)
EDIT  supabase/functions/analyze-tv-content/index.ts          (drop responseMimeType)
EDIT  src/hooks/tv/usePersistentVideoState.ts                 (guard against [] writes mid-job)
NEW   migration: ALTER TABLE tv_transcriptions ADD COLUMN speaker_id_evidence jsonb
```

## What will NOT change

- `TvFormattedAnalysisResult.tsx` (renderer is already correct: blue/yellow split with icons)
- `analysisParser.ts` (already handles `[NOTICIA N]` text inside content-type sections)
- `useChunkedVideoUpload`, AssemblyAI transcription stage, speaker LETTER assignment by AssemblyAI
- Radio analysis pipeline + prompts
- Prensa Escrita, Social, Dashboard, Auth, shared components
- The CPU-timeout fix from last turn (decoupled background analysis stays in place)
- DB schema for any other table; only one additive jsonb column on `tv_transcriptions`
- Frontend hooks, polling, realtime subscriptions, video upload flow

## Acceptance criteria

- During and after processing, the **video file card stays visible** with playback intact. No more "No hay videos subidos" mid-job.
- Speaker labels in transcription show **real names from on-screen lower-thirds**: e.g., `SPEAKER A (José Torres Ruiz - Inspector CIC Guayama):`, with `speaker_id_evidence` listing the source frame.
- Analysis card shows a **blue card per PROGRAMA REGULAR** containing multiple `[NOTICIA N]` blocks (Título, Resumen, Participantes, Temas, Tono, Categorías, 5W, Palabras clave, Puntuación de impacto) AND **separate yellow cards per ANUNCIO PUBLICITARIO** with marca / CTA / tono. Matches `Analisis_Example.docx.md`.
- "Reintentar análisis" produces the same per-story format with proper color separation.
- Backfilled historical jobs display the per-story format (text-only speaker labels, since their video frames are gone).
- Radio and Prensa Escrita analysis are unchanged.

