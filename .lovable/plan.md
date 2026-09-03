# CP5-C4A.3 — Prospective Digital Client Matcher Repair (source + tests only)

Scope: new shared matcher module, strict AI contract, provenance, deterministic tests, and read-only simulations. No deployment, no production writes, no keyword/DB changes.

## 1. Current matching surface (verified)

Two writers of `news_articles.clients`:

- `supabase/functions/process-rss-feed/index.ts`
  - `fetchClients()` (active clients with keywords) → `matchClientsToArticle(title, description, clients)` using `content.includes(keyword.toLowerCase())` → AI call (client list injected, model asked to return `{id,name,relevance}`) → `mergeClientMatches(ai, keyword)` → `clients` written on insert/update.
- `supabase/functions/reanalyze-articles/index.ts`
  - Same three stages, then `update({ clients, ... })`.

`process-social-feeds/feed-processor.ts` contains no `clients` writes (verified), so only the two above must adopt the shared matcher. Frontend `src/services/social/clientMatcher.ts` is display-only and stays untouched.

## 2. Files to add / modify

Add:
- `supabase/functions/_shared/clientMatcher.ts` — normalization, route tokens, deterministic keyword matching, canonical roster, AI-name resolution, merge, provenance, relevance.
- `supabase/functions/_shared/aiClientSchema.ts` — strict validator for `{ client_names: string[] }`.
- `supabase/functions/_shared/shadowMatcher.ts` — shadow comparison + diagnostic record builder.
- `supabase/function-tests/shared/client-matcher/*_test.ts` — normalization, route boundaries, false positives, positives, AI safety, provenance merge.
- `supabase/function-tests/shared/client-matcher/fixtures/metropistas.policy.ts` — PROPOSED / NOT YET APPLIED policy fixture.

Modify (matcher call sites only):
- `process-rss-feed/index.ts`, `reanalyze-articles/index.ts` — import shared matcher; AI prompt switched to name-only; shadow computation added behind an env flag defaulting to off; persisted `clients[]` remains the current-matcher result in this phase.

Portal-sender runtime files are not touched; their C4A.2D hashes must remain identical.

## 3. Contracts

Normalization: NFD → strip combining marks → lowercase → map `–—‑` to `-` → collapse whitespace → keep the original text untouched (matching copy only).

Term boundary: no raw `includes`. Match with Unicode lookarounds `(?<![\p{L}\p{N}])term(?![\p{L}\p{N}])` on the normalized haystack, escaping the term; multi-word phrases matched as whitespace-flexible sequences.

Routes: `PR-52 | PR 52 | PR–52` normalize to token `pr 52`; matching requires a digit boundary so `PR 5` never matches `PR 52/53/59` and `PR 22` never matches `PR 220`. No prefix matcher.

Canonical roster: maps of UUID→client, normalized name→client, normalized alias→client, loaded once per run from `public.clients` (active). An id is accepted only when UUID-syntax valid AND present in the roster; anything else (`client_uuid`, `metropistas_uuid`, orphan UUIDs) is rejected and counted.

AI contract: model returns names only (`{"client_names": [...]}`). Server resolves canonical name → alias → rejected. No fuzzy/semantic matching, no model IDs, unknown names counted then discarded.

Provenance object (backward-compatible superset): `{ id, name, relevance, match_method: keyword|ai_name_resolved|both, matched_keywords: [], matched_field: title|description|both|ai }`. Dedupe key = canonical UUID; keyword + AI on the same client yields one object with `match_method: "both"` and the deterministic evidence preserved. No provenance backfilled onto historical rows.

Proposed relevance matrix (for review, not silently finalized):

```text
brand/alias exact in title                -> alta
brand/alias exact in description only     -> media
specific asset/route keyword in title     -> alta
specific asset/route keyword in desc      -> media
generic keyword (policy-flagged)          -> no match at all
AI-resolved + any deterministic evidence  -> deterministic value wins
AI-resolved only                          -> baja
```

Keyword count no longer drives relevance.

## 4. Metropistas policy fixture (PROPOSED / NOT YET APPLIED)

Remove as standalone: `carretera`, `autopista`, `Autopistas`, `peaje`, `CESCO`.
Keep: `Metropistas`, `Abertis`, `AutoExpreso`, `Puente Teodoro Moscoso`, `Tarifas de peajes`, `Aumento de peajes`, `Expreso José de Diego`, `expreso Martínez Nadal`, `Autopista Luis A. Ferré`, `Autopista Roberto Sánchez Vilella`, `Carril dinámico`, `Cogestión vehicular`, `Accidentes en autopistas`, `Asistencia en la carretera`.
Route tokens: `PR-5, PR-20, PR-22, PR-52, PR-53, PR-66`. Fixture lives in test code only; `public.clients.keywords` is untouched.

## 5. Shadow mode

Old matcher still determines persisted `clients[]`. New matcher computes a proposed set; a diagnostic record (source_id, old ids, new ids, added, removed, unchanged, matched evidence, rejected identities, counts) is emitted. No article bodies, no secrets.

Recommendation: deterministic-only shadow using the existing single AI call's nominations where available, so incremental AI calls per article = 0. Structured `console.log` diagnostics for the first evaluation window; a dedicated `matcher_shadow_runs` table schema will be proposed (not created) if a full week of aggregation is required. Estimated incremental cost: sub-millisecond CPU per article, no extra DB reads (roster already loaded), ~1 extra log line per article (~2–5k/day).

## 6. Verification in this phase

- New deterministic unit tests (normalization, routes, false positives, positives, AI safety, provenance merge).
- Read-only local simulation over ~30–50 representative production rows across the requested categories (pilot row, direct brand, carretera-only, autopista-only, peaje-only, CESCO, PR-52, AutoExpreso, placeholder-id rows, multi-client), old vs new, no writes, no AI invocation.
- Read-only corpus simulation of the deterministic matcher over the 900-row Metropistas Digital universe: retained/removed counts by evidence group plus rows needing AI fallback.
- `deno test` for the new suites plus the existing 73 portal-sender tests (must stay green) and `deno check` on all touched functions.
- Full SHA-256 list for new/modified files and all portal-sender runtime files (must equal approved C4A.2D values; any drift = STOP).

## 7. Explicit non-actions

No deployment, no `process-rss-feed`/`reanalyze-articles`/portal-sender invocation, no Portal contact, no gate/secret/cron changes, no schema/RLS changes, no writes to `news_articles`, `clients`, or `clients.keywords`.
