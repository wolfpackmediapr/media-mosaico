## Goal

Keep TV analysis **fully automatic** (appears alongside transcription, no user click), but make it as reliable as Radio. Today the analysis is in the DB but the UI misses it because of mount-order races and lack of persistence.

## Why Radio "feels" instant (even though it's user-initiated)

Radio captures the analysis **directly from the function response** and writes it to `usePersistentState` (sessionStorage) in the same tick. Survives remounts, navigation, refresh — no DB round-trip needed afterward.

## Why TV fails

TV uses an async two-stage pipeline (`process-tv-with-qwen` → `analyze-tv-stored`). The UI must observe the DB row updating. Three observation mechanisms exist and each has a defect:

1. **Initial fetch on mount** — runs before `analyze-tv-stored` writes `full_analysis` → gets `null`.
2. **Window event `tv-analysis-ready`** — `dispatchedRef` is per-instance, so if `useTranscriptionPolling` unmounts/remounts (tab switch, section gate flips), the event fires once in a dead instance and the live listener misses it.
3. **Fallback polling in `useTvAnalysisDisplay`** — works only while the component stays mounted, and `pollStartedAtRef` resets every effect re-run so the timeout never fires correctly.
4. **No persistence** — `existingAnalysis` lives only in component state. Navigate away → back → empty → race repeats.

## Fix (keeps automatic flow, no user button)

### File 1 — `src/hooks/tv/useTvAnalysisDisplay.ts`

- Replace `useState<string>("")` for `existingAnalysis` with `usePersistentState<string>` keyed by `tv-content-analysis-${transcriptionId}`. Mirrors Radio's pattern — survives remounts and navigation.
- Derive `hasFullAnalysis` from the persisted value rather than tracking it in separate state.
- In the polling `useEffect`: depend only on `transcriptionId`. Check `hasFullAnalysis` inside the interval callback to decide whether to clear it. Initialize `pollStartedAtRef.current` only when `null` so it survives effect re-runs (10-min timeout actually works).
- On clear (transcriptionId becomes null), also remove the persisted key.

### File 2 — `src/hooks/tv/useTranscriptionPolling.ts`

- Promote `dispatchedRef` from a per-instance `useRef<Set>` to a **module-level `Set`** so the once-per-id guard survives hook unmount/remount. Event fires reliably exactly once per transcription id, regardless of which mount of the section observed the change.

### File 3 — `src/components/tv/containers/TvMainContent.tsx`

- Drop the gating condition on `analysisSection`. Currently it only renders when `(transcriptionText || currentVideoPath || analysisResults)` — meaning the listener inside `useTvAnalysisDisplay` may not be mounted at the moment the polling hook dispatches the event. Render `<TvAnalysisSection>` whenever `transcriptionId` exists so its listener is always live.

## Diffstat (expected)

```text
src/hooks/tv/useTvAnalysisDisplay.ts        | ~22 ++++++++++--------
src/hooks/tv/useTranscriptionPolling.ts     |  ~6 ++----
src/components/tv/containers/TvMainContent.tsx |  ~4 ++--
3 files changed, ~16 insertions(+), ~16 deletions(-)
```

## Verification

1. Upload TV video → transcription appears → analysis card auto-populates within ~8s of `analyze-tv-stored` finishing. No button click.
2. Navigate away mid-processing → back → analysis hydrates from sessionStorage if it landed, or polling picks it up.
3. Hard refresh after completion → initial fetch reads DB, persists, displays.

No DB schema, no edge function, no UX changes — same auto-appearing card, just reliable.