I will do exactly this single diagnostic change and nothing else:

1. Add this `console.log` at the very top of the polling `useEffect` in `src/hooks/tv/useTvAnalysisDisplay.ts`, before any early return:

```ts
console.log('[useTvAnalysisDisplay] Polling effect evaluated:', {
  transcriptionId,
  hasExistingAnalysis: !!existingAnalysis,
  existingAnalysisLength: existingAnalysis?.length || 0
});
```

2. Let the preview rebuild from that edit.

3. Test one TV upload in the running preview.

4. Send you the relevant console output for `[useTvAnalysisDisplay] Polling effect evaluated:` so we can confirm whether the hook is running and what state it sees.

No backend changes. No prompt changes. No synchronization refactor. No Parts 5–7.