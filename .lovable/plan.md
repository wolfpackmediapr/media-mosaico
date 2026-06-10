# Bug-fix Rollout Plan

Goal: ship fixes incrementally so we can verify each one in the live app before touching the next. Each phase is independently deployable and revertible. We pause after every phase for you to sanity-check before moving on.

---

## Phase 1 — P1 fixes (one at a time)

### 1.1 Inactive clients showing in Alertas (Ética Gubernamental, AAA)
- **Root cause**: `client_alerts` for these clients is empty in the DB — they're appearing through the **Typeform alerts surface** (`get-typeform-alerts` edge function), which returns whatever client labels the form responder picked, with no cross-check against `public.clients.is_active`.
- **Fix**:
  - In `supabase/functions/get-typeform-alerts/index.ts`, after normalizing each response, load the active-client allow-list once (`select name from clients where is_active = true`) and filter `norm.clients` to that set (case/diacritics-insensitive via the existing `normalizeText`). Drop the item if no active client remains *and* the request was scoped to a client filter; otherwise keep the item but with cleaned `clients[]`.
  - Bust the in-memory `cache` TTL on the function (or key it by an `active_clients_version`) so this takes effect immediately.
- **Verify**: Open `/envio-alertas`, confirm Ética Gubernamental / AAA no longer appear as recipients.

### 1.2 Radio Typeform capped at 3 alerts
- **Root cause hypothesis**: `useTypeformAlerts` has `staleTime: 5min` and the edge function caches responses in-memory for 5min keyed by `formType`. After a new Typeform submission the UI still shows the stale page-1 slice (3 items) until cache expires.
- **Fix**:
  - Add a "Refrescar" affordance already wired to `refresh()` — verify it invalidates and forces a `since=<lastSeen>` fetch (bypasses server cache as the code already does when `since` is set).
  - Lower the server cache TTL for `radio` to ~60s, and on `refresh` from the client, pass `since` = newest known `submittedAt` to bypass cache entirely.
  - Audit `page_size` default (25) — confirm the "3 alerts" is not a Typeform API completed-filter issue by logging `json.items.length` from `fetchResponses`.
- **Verify**: Submit a test Radio Typeform response, click Refrescar, confirm it appears within seconds and pagination shows >3.

### 1.3 "Sí" alerts without client identified
- **Root cause**: Typeform "Sí/No" boolean answers normalize to `'Sí'` but `classifyField` only matches client-list fields by title keywords ("lista de email", "clientes", "cliente"). Responses where the client is captured in a different field title (e.g. "¿Es relevante para algún cliente?") fall through with empty `clients[]`.
- **Fix**:
  - Audit the actual TV/Radio form field titles via the Typeform schema endpoint (logged once at boot) and extend `classifyField` keyword list to cover every variant currently in use.
  - When `clients[]` is empty but a "Sí" boolean exists for a client-relevance question, fall back to scanning `rawAnswers` for any value that matches an active client name (reuse 1.1's allow-list).
- **Verify**: Find a recent "Sí" alert in EnvioAlertas, confirm `clients` is populated.

### 1.4 TV summary name hallucinations
- **Root cause**: `analyze-tv-stored` / `tvPromptBuilder` prompts don't explicitly forbid inventing names not present in the transcript.
- **Fix**:
  - Update prompts in `supabase/functions/analyze-tv-stored/index.ts` and `supabase/functions/analyze-tv-content/tvPromptBuilder.ts` with hard constraints:
    - "Solo usa nombres propios que aparezcan literalmente en la transcripción o en el mapa de hablantes provisto."
    - "Si no estás seguro del nombre, usa el rol (Presentador/a, Invitado/a) sin inventar."
  - Pass the resolved `speakerMap` (already computed in qwen flow) into the analysis prompt as a closed allow-list.
- **Verify**: Re-run an existing TV transcript via Reanalyze, compare summary to transcript.

---

## Phase 2 — P2 polish

### 2.1 Speaker attribution (who said what)
- Tighten `tvPromptBuilder` to require `"[Nombre o rol]: cita"` format using **only** speaker-map entries; reject quotes attributed to unmapped speakers.
- Add a post-parse validator in `analysis-parser.ts` that strips/flags attributions outside the speaker map.

### 2.2 Intermittent incomplete TV analysis
- Telemetry already shows `near_wall=true elapsed_ms=138254` on qwen-plus. Two changes:
  - Raise `max_tokens` budget for the analysis step (currently capped — see `analyze-tv-stored`) and split into "summary" + "clients/keywords" two-pass when transcript > 10k chars.
  - Add retry-with-shorter-prompt on truncation (detect missing closing brace / cut-off section headers).

### 2.3 Radio fullscreen back-button hidden
- In `src/components/radio/` (likely `EnhancedVideoPlayer` / Radio fullscreen wrapper), the back button sits below the fullscreen overlay. Bump its `z-index` above the player overlay (`z-50` → `z-[60]`) and ensure `position: fixed` is preserved when the document is in fullscreen.

---

## Phase 3 — Cleanup
- Add a small `useActiveClients()` hook reused by Typeform alerts surface and AI-match notifications so the active-client list has one source of truth.
- Add a brief note to `mem://features/alertas` describing the active-client filter + Typeform cache rules.

---

## Out of scope
- No DB schema changes (the `is_active` column already exists; the listed clients are already inactive).
- No changes to authentication, RLS, or ingestion cron schedules.
- No UI redesigns — only the z-index fix in 2.3.

## Suggested order to ship & test
1.1 → pause & verify → 1.2 → pause & verify → 1.3 → pause & verify → 1.4 → pause & verify → 2.1 → 2.2 → 2.3 → 3.

Tell me which phase to start with (default: **1.1**) and I'll implement just that one, then wait for your verification before moving on.
