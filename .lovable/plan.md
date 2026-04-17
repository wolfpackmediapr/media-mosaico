
User wants to revert `analyze-radio-content` back to using OpenAI directly (as it was before the recent migration to Lovable AI Gateway).

## Plan: Revert Radio Analysis to OpenAI Only

**File**: `supabase/functions/analyze-radio-content/index.ts`

Remove the Lovable AI Gateway logic and fallback wrapper. Restore direct OpenAI call as the sole provider.

### Changes
- Remove `callLovableAI` function and the provider-selection block
- Keep only `callOpenAI` logic, called directly
- Keep the `max_tokens: 1500` improvement (helpful regardless of provider)
- Keep `model: 'gpt-4o-mini'`, `temperature: 0.3`
- Throw clear error if `OPENAI_API_KEY` is missing
- Remove `lovableKey` references

### Resulting flow
```text
request → build prompt → call OpenAI (gpt-4o-mini) → return analysis
```

### Scope
- One file, ~40 lines removed
- Redeploy `analyze-radio-content`
- No frontend, DB, or other function changes
- TV pipeline untouched
