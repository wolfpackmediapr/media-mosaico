I checked the current TV pipeline, recent Edge Function logs, and the latest `tv_transcriptions` rows. The loop is real, and the root cause is not only Qwen or AssemblyAI alone.

Findings:
- AssemblyAI is producing diarized utterances, but its speaker boundaries are imperfect in some clips, especially TV shows with commercials, fast interruptions, and overlapping host/guest dialogue.
- Qwen speaker identification is currently text-only. Logs show `speaker_id_status=success`, but that only means Qwen returned a map; it is not true vision-grounded name identification.
- The stored backend transcript is currently being modified into display text like `SPEAKER A (Bexaida - Invitada): ...`.
- The frontend editor then re-formats parsed utterances using shared Radio utilities. That creates the UI discrepancy/doubling pattern like `SPEAKER A: SPEAKER A|Bexaida|Invitada: ...` and can degrade the transcript display even when the DB row is cleaner.
- The old project memory says TV speaker identification should use vision/lower-thirds. Current Qwen Stage 3 does not do that for chunked videos; it only infers from transcript text.

Plan to fix without touching Prensa Escrita, Radio behavior, or site-wide behavior:

1. Backend: stop mutating the canonical transcript into UI/display markup
   - In `supabase/functions/process-tv-with-qwen/index.ts`, keep AssemblyAI’s diarized transcript as the canonical text format:
     - `[00:00] SPEAKER A: dialogue`
     - `[00:26] SPEAKER B: dialogue`
   - Do not inject names/roles directly into every `SPEAKER X` header as the primary stored transcript.
   - Instead, compute a separate speaker identity map internally and use it only to create a clean annotated transcript format or metadata for the UI.
   - Preserve `speaker_id_status`, `speaker_id_method`, and `speaker_id_error` for debugging.

2. Backend: make AssemblyAI and Qwen work in concert with clear responsibilities
   - AssemblyAI remains responsible for `who spoke when` using `utterances` and timestamps.
   - Qwen is responsible for `who is that speaker` using the diarized transcript and, where possible, vision context.
   - Add a guard so Qwen never changes AssemblyAI’s speaker boundaries or merges/splits utterances. Qwen can only assign identity to existing speaker letters.
   - Add validation that every Qwen key maps to an existing AssemblyAI speaker letter only.

3. Backend: restore vision-grounded speaker identification instead of text-only guessing
   - For single-file video path: use the signed video URL / existing video-capable path to ask the visual model to read lower-thirds/chyrons and identify speaker names/roles.
   - For chunked video path: do not send raw chunk byte slices to `qwen-vl-max` as video. That was broken. Use the available assembled/streamed-video approach where feasible, or fall back explicitly to `text-only` with a clear status/log when vision is not available.
   - The speaker ID method should report one of:
     - `vision-video` when lower-third/visual evidence was used
     - `text-only` when only dialogue evidence was available
     - `failed`/`skipped` with a real reason when no trustworthy identity can be assigned
   - Names are accepted only when there is visual lower-third evidence or direct textual evidence. Otherwise fallback remains `Hablante A`, `Hablante B`, etc.

4. Frontend: make TV use a TV-specific formatting path, not Radio’s speaker text formatter
   - In `src/hooks/tv/useTvTranscriptionEditor.ts` / TV editor flow, avoid using Radio’s `formatSpeakerText()` for TV parsed utterances.
   - Keep Radio’s current behavior unchanged.
   - TV should pass parsed `utterances` to the enhanced editor for colored cards, but it should not rewrite the raw transcript into `SPEAKER A: SPEAKER A|Name|Role:`.
   - This fixes the doubled prefix and restores the expected colored UI without affecting Radio.

5. Frontend parser: accept both clean backend and annotated backend formats safely
   - Harden `src/utils/tv/speakerTextParser.ts` so it supports:
     - `[00:00] SPEAKER A: text`
     - `[00:00] SPEAKER A (Name - Role): text`
     - legacy malformed `SPEAKER A: SPEAKER A|Name|Role: text` only as a repair input, not as an output format.
   - The parser should produce speaker IDs as:
     - `A` when unidentified
     - `A|Name|Role` when identified
   - The display layer renders those as `Hablante A` or `Name (Role)`.

6. Add diagnostics to stop the loop
   - Add structured Edge logs showing:
     - AssemblyAI utterance count
     - detected speaker letters
     - Qwen identity map
     - vision/text method used
     - how many identities were accepted vs rejected
   - Add a frontend console log only in TV parser when it repairs legacy malformed text, so we can distinguish DB issues from UI transformation issues.

7. Verification
   - Check latest `tv_transcriptions` rows after implementation for:
     - `speaker_id_status`
     - `speaker_id_method`
     - `speaker_id_error`
     - transcript preview without doubled prefixes
   - Confirm TV transcript cards show colors and correct labels.
   - Confirm Radio and Prensa Escrita files/components were not changed.

Technical scope:
- Expected files to edit:
  - `supabase/functions/process-tv-with-qwen/index.ts`
  - `src/utils/tv/speakerTextParser.ts`
  - TV-specific editor hook/component wiring only if needed, likely `src/hooks/tv/useTvTranscriptionEditor.ts` and/or `src/components/tv/TvTranscriptionEditor.tsx`
- Files to avoid changing:
  - Prensa Escrita modules
  - Radio processing/transcription behavior, except only reading shared utilities if needed
  - Site-wide layout/routing/auth

Important behavior after the fix:
- If the system cannot identify a name, it shows `Hablante A/B/C`, not guessed names.
- If lower-third or direct textual evidence identifies the speaker, it shows the real name and role.
- AssemblyAI controls timing/speaker turns; Qwen only labels those speakers.
- No more `SPEAKER A: SPEAKER A|Name|Role:` UI output.