# Audit: TV/Radio analysis & alert bugs

## Direct answer to your question

**Yes** — the clients used in TV and Radio analysis prompts come from `Configuración > Ajustes > Clientes` (the `public.clients` table). Confirmed in:

- `src/hooks/radio/useClientData.ts` → `supabase.from('clients').select('*')`
- `supabase/functions/process-tv-with-qwen/index.ts:1132` → `from('clients').select('name, keywords')`
- `supabase/functions/process-tv-with-gemini/index.ts:2421` → `from('clients').select('*')`
- `supabase/functions/analyze-tv-stored/index.ts:192` → `from('clients').select('name, keywords')`
- `supabase/functions/analyze-radio-content` receives clients from the frontend (which loaded them via `useClientData`)

**None of these queries filter `is_active = true`** — so the disable toggle we just added has no effect on AI prompts yet. That's bug #4.

## Findings confirmed against the codebase

| # | Bug | Confirmed root cause |
|---|-----|----------------------|
| 1 | Name hallucination | Both `process-tv-with-qwen/index.ts:316` and `process-tv-with-gemini/index.ts:181` literally instruct the model: `✓ RECONOCE personalidades conocidas de noticias de Puerto Rico visualmente`. No "use only names present in transcript" guard, no post-gen validator. |
| 2 | Attribution errors | Free-form prose output — no structured `{speaker, claim}` schema in any of the four analysis prompts. |
| 3 | "Quién dice qué" missing | No required speaker→statement section in prompts; UI has no dedicated render slot. |
| 4 | **Former clients in alerts** | Confirmed via DB query: all 22 clients (incl. **AAA**, **Ética Gubernamental**) currently have `is_active=true`. No edge function filters by `is_active`. The disable toggle from the prior task added the column + UI but did not propagate the filter into AI/notification queries. |
| 5 | Incomplete segment analysis | `analyze-tv-stored` runs one big prompt at `max_tokens=12288` with a single Qwen call — confirmed at line ~200; near edge-function wall-time. |
| 6 | Typeform 3-alert limit (Radio) | `src/components/radio/TypeformAlert.tsx` — iframe is mounted via `data-tf-live` and only torn down on the manual "Ocultar" button. No `onSubmit` reset, no remount key after submit. |
| 7 | Fullscreen back button gone | Same file — refresh/hide buttons live **outside** the Typeform iframe, so they disappear when Typeform goes fullscreen. |
| 8 | "Sí" alert with no client | No invariant in any TV/Radio prompt forbidding `Alerta: SÍ` + `Clientes: ninguno`. No post-parse validator. |

### Critical extra finding (matches GPT-5.5 audit)

- **Three TV analysis paths use three different prompts:**
  - `analyze-tv-content` → local `./tvPromptBuilder.ts`
  - `process-tv-with-gemini` → inline prompt in `index.ts`
  - `process-tv-with-qwen` → inline prompt in `index.ts`
  - `analyze-tv-stored` → **canonical** `_shared/tvAnalysisPrompt.ts` ✓ (only one using it)
- **`client_alerts` insertion bug confirmed in 3 frontend files** (insert `client_id: user.id`, which is the auth UUID, not a client UUID — FK fails silently):
  - `src/hooks/tv/useTvNotifications.ts:31`
  - `src/components/radio/RadioAnalysis.tsx:240`
  - `src/components/transcription/TranscriptionAnalysis.tsx:111`

## Remediation plan

### Phase 1 — Quick wins (high impact, low risk)

1. **Filter `is_active=true` everywhere clients feed AI/notifications.** Single-line change in 6 spots:
   - `src/hooks/radio/useClientData.ts` → `.eq('is_active', true)`
   - `process-tv-with-qwen`, `process-tv-with-gemini`, `analyze-tv-stored`, `process-rss-feed`, `process-press-pdf`, `process-press-pdf-filesearch`, `reanalyze-articles`, `process_content_notifications`, `analyze_notification_relevance`, `test_notification_settings`, `process_notification_delivery`, `process-notifications` → same `.eq('is_active', true)` on each `from('clients')` select.
   - Use the admin UI to disable AAA, Ética Gubernamental (or do a one-shot `UPDATE`).

2. **Fix `client_alerts` FK bug.** Replace `client_id: user.id` in the 3 files with the actual matched client UUID (lookup by name from analysis result, similar to `mediaAnalysisService.ts`). If no client matched, skip the insert.

3. **Remove the hallucination instruction** from `process-tv-with-qwen` (line 316) and `process-tv-with-gemini` (line 181). Replace with: "Identifica personas SOLO si su nombre aparece textualmente en la transcripción o en un rótulo en pantalla."

### Phase 2 — Consolidate prompts

4. **Make `_shared/tvAnalysisPrompt.ts` the single source of truth.** Update `process-tv-with-gemini`, `process-tv-with-qwen`, and `analyze-tv-content` to import `buildTvAnalysisPrompt` from `_shared`. Delete `analyze-tv-content/tvPromptBuilder.ts`.

5. **Add prompt invariants + JSON schema:**
   - Required structured field `quien_dice_que: [{ speaker, statement, timestamp }]`.
   - Required field `alerta: { triggered: bool, matched_clients: string[] }` with invariant `triggered=true ⇒ matched_clients.length > 0`.
   - Constraint: "Use ONLY names appearing verbatim in the transcript or in on-screen text. If unsure, return `null`."

6. **Add post-generation validator** in `analyze-tv-stored` and `analyze-radio-content`:
   - Cross-check every name in output against the transcript text.
   - Enforce the alerta invariant; if violated, set `triggered=false`.
   - Strip names not found in transcript.

### Phase 3 — Segment & UX

7. **Chunk `analyze-tv-stored`** by transcript segment (~3-5k token chunks), run in parallel with `Promise.allSettled`, merge results. Should drop per-call time below the 60s soft limit.

8. **Radio Typeform reset (bugs 6+7):**
   - Add a `key` state to force iframe remount.
   - Subscribe to Typeform's `submit` event via `window.tf.load(..., { onSubmit })` and bump the key.
   - Move the refresh/hide controls **inside** the iframe wrapper using Typeform's `hideHeaders`/`hideFooter`+ `transitiveSearchParams`, OR add a floating control that listens for the fullscreen-change event and re-portals itself.

## Technical reference

```text
clients (DB)
  │  is_active = true ←── must filter HERE in every query below
  ├─► useClientData.ts ──► RadioAnalysis ──► analyze-radio-content
  ├─► process-tv-with-qwen (DB fallback)
  ├─► process-tv-with-gemini (DB fallback)
  ├─► analyze-tv-stored (DB fallback)
  └─► RSS / press / notifications fns

TV prompt sources (consolidate → canonical):
  _shared/tvAnalysisPrompt.ts  ← keep, expand
     ▲
     └── analyze-tv-stored ✓ (already uses)
     ✗ analyze-tv-content       (uses local tvPromptBuilder.ts)
     ✗ process-tv-with-gemini   (uses inline prompt)
     ✗ process-tv-with-qwen     (uses inline prompt)
```

## Effort estimate

- Phase 1: ~4-6h (mostly mechanical, low risk) — fixes bugs #4, #1 partial, alerts table starts populating
- Phase 2: ~12-18h — fixes bugs #1, #2, #3, #8
- Phase 3: ~10-14h — fixes bugs #5, #6, #7

## What I need from you to proceed

Pick a starting scope:

- **A)** Phase 1 only — fastest path to stop sending disabled clients to AI and to start populating `client_alerts`.
- **B)** Phase 1 + Phase 2 — full prompt fix, all hallucination/attribution bugs.
- **C)** All three phases (largest changeset).
- **D)** A specific bug number you want done first.
