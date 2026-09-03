# CP5-C4A.3 — Prospective Digital Client Matcher Repair (revised, source + tests only)

Revision incorporates the review amendments. No implementation until approval. No deployment, no DB writes, no keyword/secret/gate changes.

## 0. Write-semantics reconciliation (item 3 — resolved from current source)

`supabase/functions/process-rss-feed/index.ts` — **INSERT-ONLY** for `clients[]`:
- duplicate by exact `link` → `return null` (no write)
- duplicate by `title + source + same UTC day` → `return null` (no write)
- older than 7 days → skipped
- otherwise: AI analysis, then a single `.insert([{ ... clients: analysis.clients ... }])`
- no UPDATE, no UPSERT, no existing-row `clients[]` overwrite anywhere in the file (only `feed_sources` status is updated)

`supabase/functions/reanalyze-articles/index.ts` — **UPDATE-ONLY**, selecting rows where `sentiment IS NULL`, ordered by `pub_date desc`, limited by request `limit`; it overwrites `clients`, `category`, `summary`, `keywords`, `sentiment*`, `last_processed` on those rows.

So the earlier C4A.1 audit is correct and the previous draft's "insert/update" phrasing was wrong: overwriting of an existing row's `clients[]` happens **only** through `reanalyze-articles`, never through `process-rss-feed`. No other active code path writes Digital `clients[]` (`process-social-feeds/feed-processor.ts` verified to contain no `clients` writes; `src/services/social/clientMatcher.ts` is display-only).

## 1. Legacy authoritative path preserved byte-for-behavior

The existing prompt, existing deterministic matcher, existing merge and existing persisted `clients[]` stay exactly as they are in this phase and in shadow mode. The strict name-only AI contract is implemented as a **dormant** component with mocked tests only — no production article is routed through it.

```text
                   ┌─ legacy deterministic matcher
article ───────────┼─ existing AI call (unchanged prompt/contract)
                   └─ existing legacy merge
                             ↓
                    persisted clients[]  (UNCHANGED)

same article + same already-obtained AI response
      ↓  new deterministic matcher
      +  legacy-AI name adapter (names only; ids/relevance discarded)
      +  canonical server-side resolution
      ↓  proposed shadow clients[] → diagnostic log only
```

Additional AI calls in shadow: 0.

## 2. Explicit matcher mode

`DIGITAL_CLIENT_MATCHER_MODE` ∈ `legacy | shadow | new`. Missing or invalid → `legacy`. `new` is future-only and not wired to any production path in this phase. No env var is set or deployed here. Tests prove: legacy mode never runs the new matcher's write path; shadow mode persists exactly the legacy result; no shadow value can reach the persisted object.

## 3. Files

Add:
- `supabase/functions/_shared/clientMatcher.ts` — generic only: normalization, boundary matcher, route matcher, roster index builder, resolver, merge, provenance, relevance. **No client-specific rules, no Metropistas branch.** Policy (keywords, route tokens, removals) is passed in as an explicit structure by the caller/fixture.
- `supabase/functions/_shared/aiClientSchema.ts` — dormant strict future contract `{ client_names: string[] }`: array required, strings only, trimmed, empty rejected, normalized dedupe, max nomination count and max string length enforced, unknown fields rejected.
- `supabase/functions/_shared/legacyAiNameAdapter.ts` — shadow-only adapter over the existing AI object: reads `name` values only, explicitly discards `id`, `relevance` and any extra fields.
- `supabase/functions/_shared/shadowMatcher.ts` — comparison + diagnostic record builder.
- `supabase/function-tests/shared/client-matcher/*_test.ts` and `fixtures/metropistas.policy.ts` (PROPOSED / NOT APPLIED).

Modify (guarded, mode-gated, legacy default):
- `process-rss-feed/index.ts`, `reanalyze-articles/index.ts` — after the existing analysis completes, optionally compute and log the shadow comparison. The legacy prompt, merge and persisted payload are untouched.

Portal-sender runtime files untouched; their C4A.2D hashes must match exactly or STOP.

## 4. Contracts

Normalization: NFD → strip combining marks → lowercase → map `–—‑` to `-` → collapse whitespace; original journalism text never mutated.

Boundary: no `\b`, no raw `includes`. Match requires the character immediately before and after to not be a Unicode Letter/Number, via `(?<![\p{L}\p{N}])…(?![\p{L}\p{N}])` with escaped terms; multi-word phrases matched as whitespace-flexible sequences. A runtime construct-check test proves the regex compiles under the project's Deno version.

Routes: handled by a dedicated matcher separate from ordinary keywords. `PR-52 | PR 52 | PR–52` → token `pr 52`; digit-boundary enforced so `PR 5 ≠ PR 52/53/59` and `PR 22 ≠ PR 220`, `PR 66 ≠ PR 660`. No prefix matcher.

Roster/collision safety: build UUID→client, normalizedName→client(s), normalizedAlias→client(s) as multi-maps. Exactly one entry → resolve; more than one → **ambiguous, reject** (never arbitrary selection). Alias colliding with another canonical name → reject. Tests cover all three collision cases. An id is accepted only when UUID-syntax valid AND present in the active roster; `client_uuid`, `metropistas_uuid`, orphan UUIDs are rejected and counted.

Provenance superset: `{ id, name, relevance, match_method: keyword|ai_name_resolved|both, matched_keywords: [], matched_field: title|description|both|ai }`. Dedupe key = canonical UUID; keyword + AI on the same client yields one object, `match_method: "both"`, deterministic evidence preserved. No provenance backfilled onto historical rows.

Proposed relevance matrix (for review):

```text
brand/alias exact in title                -> alta
brand/alias exact in description only     -> media
specific asset/route keyword in title     -> alta
specific asset/route keyword in desc      -> media
generic keyword (policy-removed)          -> no match
AI-resolved + any deterministic evidence  -> deterministic value wins
AI-resolved only                          -> baja
```

Keyword count no longer drives relevance.

## 5. Metropistas policy fixture — PROPOSED / NOT APPLIED

Remove as standalone: `carretera`, `autopista`, `Autopistas`, `peaje`, `CESCO`. Keep: `Metropistas`, `Abertis`, `AutoExpreso`, `Puente Teodoro Moscoso`, `Tarifas de peajes`, `Aumento de peajes`, `Expreso José de Diego`, `expreso Martínez Nadal`, `Autopista Luis A. Ferré`, `Autopista Roberto Sánchez Vilella`, `Carril dinámico`, `Cogestión vehicular`, `Accidentes en autopistas`, `Asistencia en la carretera`. Routes: `PR-5, PR-20, PR-22, PR-52, PR-53, PR-66`. Test-only; `public.clients.keywords` untouched.

## 6. Consumer compatibility audit (blocking, before finalizing the shape)

Repo-wide read-only inspection of `news_articles.clients` consumers — at minimum `src/services/news/api.ts`, `src/hooks/use-client-spotlight.ts`, `use-report-data`, `use-combined-news-feed`, `use-dashboard-stats`, `src/services/monitoring/mediaMonitoringService.ts`, `process_content_notifications`, `test_notification_settings`, `portal-sender/content/digital.ts`, plus every `.clients` / `clients[` / `clients.map|some|find` reference. Report per consumer: fields consumed, parsing/type assumptions, extra fields tolerated YES/NO, source change required YES/NO. The superset is adopted only if consumers tolerate extra fields; consumers are not modified except where type compatibility genuinely requires it.

## 7. Shadow diagnostics

Emitted fields: source_id, old canonical ids, proposed canonical ids, added, removed, unchanged, rejected-name count, rejected-id count, deterministic matched keywords, match methods, matcher version. Never logged: article body, full description, secrets, JWTs, service-role data, raw AI prompt, raw AI response. No shadow table created or migrated in C4A.3; a schema may be proposed only. Volume/CPU figures will be reported as **derived estimates with their derivation stated** (ingest rate × 1 line/article; matcher cost from local test timing), explicitly not a production measurement.

## 8. Simulations (read-only, no AI, no writes)

- ~30–50 representative production rows across the requested categories, old vs new, compact output.
- 900-row Metropistas Digital universe labelled a **deterministic proposed-policy simulation**, not a prediction of final AI-assisted matching. Each row classified `RETAINED_DETERMINISTIC` / `REMOVED_DETERMINISTIC` / `NEEDS_AI_EVALUATION`. Old tagging alone never retains a row; the 149 placeholder-id rows never use the invalid stored id as evidence.

## 9. Verification

New matcher test suites + existing 73 portal-sender tests green, `deno check` on all touched functions, full SHA-256 list for new/modified files and all portal-sender runtime files.

## Revised-plan verdict

```text
LEGACY AUTHORITATIVE PATH PRESERVED          YES
LEGACY AI PROMPT PRESERVED IN SHADOW         YES
ADDITIONAL AI CALLS IN SHADOW                0

PROCESS-RSS WRITE SEMANTICS RECONCILED       YES (insert-only; overwrite only via reanalyze-articles)

MATCHER GENERIC / NO METROPISTAS HARDCODE    YES
AMBIGUOUS NAME/ALIAS FAILS CLOSED            YES

FUTURE AI CONTRACT ISOLATED                  YES (dormant)
SHADOW LEGACY-AI ADAPTER DEFINED             YES

CONSUMER AUDIT INCLUDED                      YES
NEW CLIENT OBJECT BACKWARD COMPATIBLE        PENDING AUDIT

SHADOW RESULT CAN MODIFY clients[]           NO
DB WRITES IN C4A.3                           NO
DEPLOYMENT IN C4A.3                          NO

READY TO IMPLEMENT C4A.3 SOURCE              YES (on approval)
```
