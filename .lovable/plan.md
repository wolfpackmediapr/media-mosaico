# Fix: TV Analysis Not Showing in UI (Staleness Fix)

## What's actually broken

Yesterday's data confirms **the analysis pipeline works** — 20 of 21 jobs since yesterday got both transcription and analysis written to the DB. The orphaned job `33fe18a2…` you reported actually *did* get its `full_analysis` filled in 3 minutes after transcription. The UI just never reflected it.

There are two root causes feeding the same symptom:

### Root cause 1 — Realtime is OFF for `tv_transcriptions`

`useTvAnalysisDisplay.ts` already opens a `postgres_changes` channel listening for the late `full_analysis` UPDATE. But `pg_publication_tables` confirms the table is **not** in the `supabase_realtime` publication, so the channel never fires. Late writes from `analyze-tv-stored` are silently dropped client-side.

### Root cause 2 — Polling stops at `status='completed'`

`useTranscriptionPolling.ts` line 53:
```ts
if (data.status === 'completed' || data.status === 'failed') return false;
```
Stops polling the moment transcription is saved, even when `full_analysis` is still NULL. Same pattern in `useTvVideoProcessor.ts` (`setActiveProcessingId(null)` + `setIsProcessing(false)` fire on completion). So there's no fallback when Realtime is unavailable.

### Defense-in-depth — `analyze-tv-stored` has no `finally` block

When the function dies mid-stream (rare, but possible with the larger shared prompt), nothing terminal is written to the DB and we can't tell from the data whether it failed or is still running. Violates the existing project memory rule for `EdgeRuntime.waitUntil` background tasks.

## Changes

### 1. Enable Realtime on `tv_transcriptions` (migration)

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_transcriptions;
ALTER TABLE public.tv_transcriptions REPLICA IDENTITY FULL;
```

This alone should fix the symptom for ~all future jobs, because `useTvAnalysisDisplay` already subscribes correctly.

### 2. Keep polling until `full_analysis` lands (or hard timeout)

Edit `src/hooks/tv/useTranscriptionPolling.ts`:
- Add `full_analysis` and `created_at` checks to the `refetchInterval` decision.
- Continue polling while `status='completed' && full_analysis IS NULL && elapsedSinceCreated < 10 min`.
- Slow the interval to 8s once transcription is in (analysis stage is longer-cycle).
- Stop on: `status='failed'` OR `full_analysis IS NOT NULL` OR 10-minute hard timeout.

```ts
refetchInterval: (query) => {
  const data = query.state.data;
  if (!data) return false;
  if (data.status === 'failed') return false;

  const elapsedMs = Date.now() - new Date(data.created_at).getTime();
  const HARD_TIMEOUT = 10 * 60 * 1000;

  // Transcription done but analysis still pending — keep polling, slower
  if (data.status === 'completed' && !data.full_analysis && elapsedMs < HARD_TIMEOUT) {
    return document.hidden ? 20000 : 8000;
  }
  // Fully done OR timed out
  if (data.status === 'completed' && (data.full_analysis || elapsedMs >= HARD_TIMEOUT)) {
    return false;
  }
  // Still transcribing
  return document.hidden ? 15000 : 5000;
}
```

### 3. Don't drop the active processing handle until analysis lands

Edit `src/hooks/tv/useTvVideoProcessor.ts`:
- In the "tab visibility sync" branch and the "resume from DB" branch, when `status='completed'` is detected but `full_analysis` is still empty, keep `isProcessing` and `activeProcessingId` set so the polling/Realtime hooks remain alive. Only flip them to "done" once `full_analysis` is populated or the 10-min timeout hits.
- When the timeout hits with no analysis, surface a non-blocking toast (`"El análisis está demorando más de lo normal. Refresca la página en unos minutos."`) and release `isProcessing`.

### 4. Add `finally` block to `analyze-tv-stored` (defense-in-depth)

Edit `supabase/functions/analyze-tv-stored/index.ts`:
- Wrap the handler body in `try / catch / finally`.
- On success: write `full_analysis` + extracted fields (already happens).
- On failure or unexpected isolate death: write `provider_fallback_reason = "analysis: <reason>"` so future debugging is observable in DB. No new column needed.
- Lower `max_tokens` from 16384 → 12288 to reduce odds of hitting the streaming wall-time.

```ts
let terminalReason: string | null = 'unknown failure';
try {
  // ... existing analysis flow ...
  terminalReason = null; // success
} catch (err) {
  terminalReason = err instanceof Error ? err.message : String(err);
  throw err;
} finally {
  if (terminalReason) {
    try {
      await supabase.from('tv_transcriptions').update({
        provider_fallback_reason: `analysis: ${terminalReason}`.slice(0, 500),
      }).eq('id', transcriptionId);
    } catch {}
  }
}
```

## Files

- **NEW migration** — enable Realtime on `tv_transcriptions` + `REPLICA IDENTITY FULL`.
- **EDIT** `src/hooks/tv/useTranscriptionPolling.ts` — keep polling past `completed` until `full_analysis` arrives or timeout.
- **EDIT** `src/hooks/tv/useTvVideoProcessor.ts` — don't release the active job until analysis lands or timeout.
- **EDIT** `supabase/functions/analyze-tv-stored/index.ts` — `finally` block + lower `max_tokens`.

## Out of scope (per your instruction)

- No "Reanalizar análisis" button.
- No new `analysis_status` column or schema-level stage tracking.
- No fix for `extract-tv-frames` CloudConvert error on chunked sessions (already gracefully falls back to text-only speaker ID).
