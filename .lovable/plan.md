
# Phase 3 — Approved Scope

Ship Typeform fixes + lightweight timeout telemetry. Defer chunking to Phase 4.

## 1. Typeform fixes (frontend only)

### Bug #6 — 3-alert limit reset after submit

`src/hooks/use-typeform.ts`
- Add a `reset()` helper that wraps `cleanup()` + delayed `initialize()` (single source of timing logic).
- Mount a single `window.addEventListener('message', ...)` inside the hook. When `event.origin` is a typeform domain and `event.data.type === 'form-submit'` (Typeform's standard postMessage), call `reset()` after ~800ms so the user sees the "thank you" screen briefly before the form remounts.

`src/components/radio/TypeformAlert.tsx` and `src/components/tv/TvTypeformEmbed.tsx`
- Add `iframeKey` state (number). Bind `key={iframeKey}` on the `<div data-tf-live=...>` wrapper so React tears it down on bump.
- Expose a "Nueva alerta" button next to refresh/hide. Clicking it bumps `iframeKey` then calls `typeform.reset()`. Used as manual fallback if postMessage doesn't fire.

### Bug #7 — Fullscreen back/hide controls

Same two component files:
- Listen for `document.fullscreenchange` events.
- When the Typeform iframe enters fullscreen, render a floating control overlay via React portal to `document.body`:
  - `position: fixed; top: 12px; right: 12px; z-index: 2147483647`
  - Two buttons: "Salir pantalla completa" → `document.exitFullscreen()`, "Ocultar" → existing `handleHideTypeform()`.
- Unmount overlay when fullscreen exits.

### Files touched (frontend)

- `src/hooks/use-typeform.ts`
- `src/components/radio/TypeformAlert.tsx`
- `src/components/tv/TvTypeformEmbed.tsx`

## 2. Timeout telemetry for `analyze-tv-stored` (edge function)

`supabase/functions/analyze-tv-stored/index.ts` — add ~15 lines, no behavior change:

- Capture `analysisStartedAt = Date.now()` before the Qwen streaming call.
- After streaming returns, compute `elapsed_ms`.
- Always emit a single structured log line:
  ```
  [analyze-tv-stored][<requestId>] TIMEOUT_TELEMETRY
    near_wall=<bool>  elapsed_ms=<n>  transcript_chars=<n>  success=<bool>
  ```
- Use `console.warn` when `elapsed_ms >= 50_000` (within 10s of the 60s wall), `console.log` otherwise.

This gives us a queryable signal in Edge logs to count how often analyses approach the wall-time. We use it to decide when to start Phase 4 chunking.

## What does NOT change

- Shared TV analysis prompt (`_shared/tvAnalysisPrompt.ts`).
- Sanitizer (`_shared/tvAnalysisSanitizer.ts`).
- Any TV transcription edge function (`process-tv-with-gemini`, `process-tv-with-qwen`, `transcribe-video`).
- DB schema, RLS, migrations.

## Validation

1. `/radio` and `/tv`: load Typeform, submit 5 alerts in a row — each presents a fresh form. Manual "Nueva alerta" also works.
2. Enter Typeform fullscreen — floating "Salir" + "Ocultar" appear top-right, both work, overlay disappears on exit.
3. Run a TV transcription end-to-end — analysis completes, look for `TIMEOUT_TELEMETRY` line in Edge logs.

Switch to **build mode** and I'll implement.
