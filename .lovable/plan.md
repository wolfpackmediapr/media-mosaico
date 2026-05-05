## Goal
Enable richer AssemblyAI features in the TV pipeline (`process-tv-with-qwen`) and gate the speech model behind an env var, so we can tune quality/cost without redeploying. No DB schema changes.

## Change (1 file)

`supabase/functions/process-tv-with-qwen/index.ts` — in `transcribeWithAssemblyAI` (around lines 760–767), update the request body:

```ts
body: JSON.stringify({
  audio_url: uploadUrl,
  language_code: 'es',
  speaker_labels: true,
  speech_model: Deno.env.get('AAI_TV_MODEL') ?? 'best',
  entity_detection: true,
  auto_chapters: true,     // NEW — helps separate program vs. ad blocks
  iab_categories: true,    // NEW — topic tags for downstream analysis
}),
```

That's the entire code change. `entity_detection` is already enabled; we keep it.

## Notes
- Default behavior is unchanged (still `best`). Setting `AAI_TV_MODEL=universal` or `=nano` in Supabase secrets later will swap models with no redeploy.
- `auto_chapters` + `iab_categories` are returned in the AssemblyAI poll response. We do not need to consume them yet for the UI to keep working — they'll be available for a future pass that surfaces ad/program boundaries and topic chips. No parsing changes required now.
- No new secrets required. No migrations. No frontend changes.

## Verification
1. Deploy `process-tv-with-qwen`.
2. Upload a short TV clip from `/tv`.
3. Check edge function logs: AssemblyAI job should be created with the new flags and complete normally.
4. Confirm the existing transcription + speaker-ID + analysis flow still works end-to-end.