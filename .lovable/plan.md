
Goal: fix the TV pipeline so each stage (upload, transcription, analysis) can independently fall back to the second Gemini key, while also reducing quota pressure and improving the user-facing error flow.

What I think of the proposed plan:
- The diagnosis is correct: the current rotation state is global per request, so an early 429 can consume the only rotation before transcription or analysis runs.
- The backend change is necessary.
- The frontend cooldown is useful, but it is not the root fix by itself.
- I recommend a few adjustments so it is safer and matches the current code structure.

Recommended implementation

1. Refactor key rotation to be stage-scoped
- In `supabase/functions/process-tv-with-gemini/index.ts`, replace the single global rotation budget with per-stage state.
- Best approach:
  - keep `currentKeyIndex`
  - replace `rotationCount` with either:
    - a per-stage counter map, or
    - a simple reset between stages if you want the smallest change
- Since the current code already has clear stage boundaries, the smallest safe fix is:
  - rename constant to `MAX_ROTATIONS_PER_STAGE`
  - call `resetRotationState()`:
    - at request start
    - after upload/file activation succeeds, before transcription
    - after transcription succeeds, before analysis

2. Important correction to your proposed constant
- Your note says:
  - `const MAX_ROTATIONS_PER_STAGE = 2; // Allow up to 2 rotations per stage (try both keys)`
- With only 2 keys and starting on primary, `2` rotations is more than needed:
  - try primary
  - rotate once
  - try secondary
- Recommendation:
  - use `const MAX_ROTATIONS_PER_STAGE = 1`
- If you set it to `2`, the code can rotate back to the primary and waste attempts unless additional guards are added.
- So the intent “try both keys once per stage” is correct, but the value should likely stay `1`.

3. Apply the reset at actual stage boundaries
In the current function there are two main processing paths:
- `processChunkedUploadWithGemini(...)`
- `processAssembledVideoWithGemini(...)`

Add resets in both paths:
- after `uploadVideoToGemini(...)` / `uploadVideoToGeminiStream(...)` completes and file is ACTIVE
- after transcription is accepted/finalized, before the analysis call

4. Increase stage spacing to reduce quota collisions
Current code already waits 5s in several places.
Recommended updates:
- change the 5s wait before analysis to 10s in both processing paths
- keep or slightly increase the wait before transcription in assembled path too
- update log text to explicitly mention 10s
This won’t eliminate quota pressure, but it should reduce same-minute burst failures.

5. Strengthen 429 behavior
Current code already retries and rotates in several places, but it should return clearer terminal failures.
When both keys are exhausted for a stage, use a specific error like:
- `Both API keys rate limited. Gemini free tier allows very limited requests per minute. Please wait 60 seconds and try again.`
Also make sure this message is preserved up to the frontend instead of being collapsed into a generic server failure.

6. Frontend cooldown is a good complement
In `src/hooks/tv/useTvVideoProcessor.ts`:
- add `lastSubmitTime`
- block rapid repeat submissions before upload begins
- show a specific toast with remaining seconds
This is especially useful because users may be retriggering processing while a previous request has already consumed quota.

7. One more recommendation the proposal missed
The current polling code throws only:
- `Processing failed on server`
That masks the real backend cause.
I recommend extending the backend to persist the exact technical failure reason on `tv_transcriptions` and then reading it in `pollForProcessingCompletion()`.
Without that, even after the key-rotation fix, the UI may still look like a generic failure when quota is the actual issue.

Assessment of current codebase
- The current edge function already has:
  - dual key lookup
  - rotation function
  - request-start reset
  - 429 handling in upload init, transcription, and analysis
- The current weakness is specifically that:
  - `rotationCount` is shared across the whole request
  - provider tracking at completion reflects final request state only, not stage-specific behavior
- The frontend currently has:
  - no submission cooldown
  - generic failed polling message
  - quota toasts only when the thrown error text contains 429/quota

Recommended final scope

Backend
- Replace global request-wide rotation budget with per-stage reset behavior
- Keep one rotation per stage, not two
- Reset before transcription and before analysis
- Increase analysis spacing from 5s to 10s
- Improve final 429 error message
- Optionally persist backend error detail for UI display

Frontend
- Add 60-second submission cooldown in `useTvVideoProcessor.ts`
- Surface a clearer “wait before retrying” toast
- If possible, read exact backend failure text from DB instead of always throwing “Processing failed on server”

Technical note
```text
Preferred behavior per stage:

Stage starts
  key = primary
  try/retry on same key
  if 429 exhausted:
    rotate once -> secondary
    retry stage
  if secondary also exhausted:
    fail stage with quota-specific error

Then:
  resetRotationState()
  proceed to next stage
```

Files to change
- `supabase/functions/process-tv-with-gemini/index.ts`
- `src/hooks/tv/useTvVideoProcessor.ts`

Recommendation summary
- Yes, implement this fix.
- Change one detail: do not use `MAX_ROTATIONS_PER_STAGE = 2` unless you also redesign the rotation logic. For the current architecture, `1` rotation per stage is the correct value.
- If you want this to fully improve debugging, include exact backend error persistence/display as part of the same pass.
