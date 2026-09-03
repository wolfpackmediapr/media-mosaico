# CP5-C4A.1 CLOSEOUT + C4A.2 PRE-FLIGHT

READ ONLY. No writes, no deletions, no sender calls, no gate changes, no deployments.

## A. 751 vs 900 reconciliation — RESOLVED

Scope: `feed_sources.platform = 'news'` only. Twitter/Instagram excluded entirely.
Mutually exclusive per-row classes:

| Class | Definition | Rows |
|---|---|---|
| A | valid canonical Metropistas UUID `08748447-…0975` present | **751** |
| B | no canonical UUID, but an element's exact normalized name = `metropistas` | **149** |
| C | alias-only resolution | **0** |
| D | Metropistas-like but unresolved/ambiguous (name contains "metropista" yet neither A nor B) | **0** |
| **A+B+C** | | **900** |

**A+B+C = 900 — matches C4A exactly. PASS.**

Precise reason for the discrepancy: my C4A.1 statement that the 900 included non-Digital
platforms was **incorrect**. Both audits used the same Digital scope. The 149-row gap is
entirely class B — rows whose only Metropistas element carries a **model-generated placeholder
id** (`metropistas`, `metropistas_uuid`, and similar non-UUID strings) instead of the canonical
UUID. C4A resolved by name, C4A.1 resolved by UUID; nothing else differs. C = 0 because
`clients.aliases` for Metropistas is an empty array, so alias resolution is structurally
impossible today.

## B. Provenance recomputed over the full 900-row resolved Digital universe

Evidence fields: `title + description` (what the matcher actually saw) plus `summary`
for P1/P2 as specified. Deterministic lowercase substring only.

| Class | 751 universe (prior) | **900 universe (authoritative)** |
|---|---|---|
| P1 — direct identity | 3 | **3** |
| P2 — configured-keyword evidence | 747 | **776** |
| P3 — stored explicit provenance | 0 | **0** (no provenance field exists in any stored element) |
| P4 — AI-only / unreproducible | 1 | **121** |
| P5 — bulk/suspicious (>5 clients) | 68 | **91** |
| P4 ∩ P5 | 0 | **22** |

| Keyword group | 751 | **900** |
|---|---|---|
| K-HIGH (`Metropistas`, `AutoExpreso`, `Abertis`, `PR-52`, `Teodoro Moscoso`, `CESCO`) | 71 | **82** |
| K-MEDIUM (`peaje`, `autopista`, not K-HIGH) | 56 | **56** |
| K-BROAD (`carretera` only) | 623 | **623** |

Rows with at least one unresolved client id: **384 of 900 (43%)**.

| Safe corpus (0 unresolved ids, ≤5 canonical clients, non-null title/link/pub_date) | Rows | New (excl. projected pilot) |
|---|---|---|
| S1 — P1 only | **1** | **0** |
| S2 — P1 or K-HIGH | **57** | **56** |
| S3 — P1 or K-HIGH or K-MEDIUM | **92** | **91** |

S1/S2/S3 are unchanged from the 751 run: every class-B row fails the zero-unresolved-ids
gate by construction. The material change is **P4: 1 → 121**. The class-B rows are exactly the
AI-only, unreproducible population, and 22 of them are also bulk-suspicious. Restricting the
prior analysis to canonical ids understated AI-only tagging by two orders of magnitude — the
corrected reading is that the pipeline has **two** independent defects of comparable severity:
an over-broad deterministic keyword (776 rows) and an unvalidated AI id path (121 rows).

## C. Historical cleanup status

Invalid-ID cleanup is **PLANNING ONLY**. No `clients[]` element is to be removed from
production in this phase. Any future mutation requires a separate dependency/rollback audit
covering: alert generation, dashboard client filters, reports, monitoring targets, portal
projections, and a pre-change snapshot with a defined rollback path.

## D. Metropistas keyword review table

Matcher behaviour for every keyword today is identical: `(title + ' ' + description)
.toLowerCase().includes(keyword.toLowerCase())` — raw substring, **no word boundary, no accent
folding, no field weighting**. Counts are Digital (`platform='news'`, plus 436 unmapped rows),
matched over title+description+summary.

| Keyword | Classification | Matcher behaviour risk | Digital matches | Metropistas-tagged | Example evidence | Recommended action |
|---|---|---|---|---|---|---|
| `Metropistas` | exact brand | safe; substring also catches "Metropistas'" | 9 | 3 | "Fitch mantiene la nota a deuda de Metropistas" | **KEEP** |
| `Abertis` | exact brand (parent co.) | safe | 1 | 0 | — | **KEEP** |
| `AutoExpreso` | exact brand/product | safe | 22 | 17 | AutoExpreso billing/toll stories | **KEEP** |
| `PR-52` | highly specific asset | safe; note `PR-52` ≠ `PR 52` (space form misses) | 81 | 40 | "Piden revisar planes de tráfico en la PR-52" | **REWRITE** — normalize `PR[-\s]?52` |
| `Puente Teodoro Moscoso` | highly specific asset | safe but accent/case fragile | 3 | 1 | — | **KEEP** (add accent folding) |
| `CESCO` | specific, but DTOP agency — **not a Metropistas asset** | fires on unrelated licensing/registry stories | 65 | 12 | CESCO appointment/licence articles | **BUSINESS DECISION REQUIRED** — is CESCO in Metropistas' monitoring brief? |
| `autopista` | moderately broad | matches any highway story islandwide | 63 | 56 | generic highway coverage | **BUSINESS DECISION REQUIRED** — brand-adjacent but not brand-specific |
| `peaje` | moderately broad | matches all toll policy, incl. non-Metropistas roads | 33 | 26 | toll-rate coverage | **BUSINESS DECISION REQUIRED** |
| `carretera` | broad/generic | **dominant contaminant** — matches "Autoridad de Carreteras", any road/crash story | 782 | **654** | 87% of all Metropistas tags | **REMOVE** |
| `PR 5` | broad/malformed | substring also matches "PR 52", "PR 53", "PR 5x" | 4 | 2 | — | **REWRITE** or REMOVE |
| `PR 20` | broad/malformed | space form rarely present in text | 2 | 1 | — | **REWRITE** (`PR[-\s]?20` + boundary) |
| `PR 22` | broad/malformed | 0 matches — space form never appears | 0 | 0 | — | **REWRITE** (`PR[-\s]?22`) |
| `PR 53` | broad/malformed | 0 matches | 0 | 0 | — | **REWRITE** |
| `PR 66` | broad/malformed | 0 matches | 0 | 0 | — | **REWRITE** |
| `Autopistas` | moderate (plural of above) | redundant with `autopista` substring | 8 | 6 | — | REMOVE as redundant |
| `Tarifas de peajes` / `Aumento de peajes` | specific phrase | phrase-fragile, near-zero recall | 1 / 0 | 1 / 0 | — | KEEP (harmless) |
| `Accidentes en autopistas` / `Cogestión vehicular` / `Carril dinámico` / `Asistencia en la carretera` | specific phrase | phrase-fragile | 0 / 0 / 1 / 1 | 0 / 0 / 0 / 1 | — | KEEP (harmless) |
| `Expreso José de Diego` / `expreso Martínez Nadal` | specific asset | accent-fragile | 1 / 4 | 0 / 0 | — | KEEP (add accent folding) |
| `Autopista Luis A. Ferrer` / `Autopista Roberto Sanchez Vilella` | specific asset | zero recall — official/spelling variants missed ("Ferré", "Sánchez Vilella") | 0 / 0 | 0 / 0 | — | **REWRITE** (accent + spelling variants) |

No business decision has been made here. `carretera` is the only unilateral REMOVE, justified
by 654/782 measured false-positive concentration.

## E. Sentinel sender-hygiene pre-flight

Exact, whole-value counts (whole table; the string is always the entire `summary` value —
never a fragment inside a real summary, and it never appears in `title`, `description`, or
`category`):

| Exact `summary` value | Rows | Internal analysis state? | Currently filtered by sender | Leak possible |
|---|---|---|---|---|
| `Error en el servicio de análisis` | **29,519** | Yes — `getFallbackAnalysis()` reason string, `process-rss-feed/index.ts` | **YES** (`SUMMARY_SENTINELS`, `content/types.ts:24`) | No |
| `Descripción insuficiente para análisis` | **1,232** | Yes — same fallback path | **NO** | **YES** |
| `Título insuficiente para análisis` | **455** | Yes — same fallback path | **NO** | **YES** |
| `Error al analizar el artículo` | **353** | Yes — same fallback path | **NO** | **YES** |
| `Error en el formato de análisis` | **35** | Yes — parse-failure fallback | **NO** | **YES** |
| `Error en el proceso de análisis` | **2** | Yes — outer catch fallback | **NO** | **YES** |

Proof of internal origin: all six are literal Spanish reason strings passed to
`getFallbackAnalysis(reason, keywordMatches)`, which sets `summary = reason`. They are produced
only when the AI call fails or input is too short. No RSS outlet emits these; each value is
exactly equal to the whole field with no surrounding text, and none appears in any other column.

Smallest defensible exact deny-list (6 entries, case/whitespace-normalized equality only —
**no `startsWith("Error")` rule**):

```
error en el servicio de análisis
descripción insuficiente para análisis
título insuficiente para análisis
error al analizar el artículo
error en el formato de análisis
error en el proceso de análisis
```

Total coverage: 31,596 rows. Sender behaviour on match stays as today — omit the `summary` key
entirely (`content/digital.ts:257`), never emit an empty string. No patch applied in this phase.

## F. Prospective matching architecture — source-level plan (planning only)

Scope is limited to client matching; every other Publiteca behaviour (feeds, dedupe, sentiment,
categories, alerts, dashboards) stays byte-identical.

**F1. Shared matcher module** — new `supabase/functions/_shared/clientMatcher.ts`, imported by
both `process-rss-feed/index.ts` and `reanalyze-articles/index.ts` so the two paths can never
drift again.
- `normalize(s)`: lowercase + Unicode NFD accent stripping + whitespace collapse.
- `matchTerm(text, term)`: normalized **word-boundary** match (regex with `\b`-equivalent
  boundaries safe for Spanish), phrase-aware for multi-word terms; optional per-keyword regex
  form for the `PR[-\s]?nn` road identifiers.
- Returns `{ clientId, matchedKeywords[], matchedField: 'title'|'description'|'both' }`.
- Relevance from evidence, not raw count: title match or brand-tier keyword → `alta`;
  body-only or asset-tier → `media`; nothing else emitted.

**F2. Keyword curation** — a data change against `public.clients.keywords`, executed only after
the section-D business decisions are returned. Removes `carretera` (and `Autopistas` as
redundant), rewrites the `PR nn` family, adds accent/spelling variants. Applied per client, with
a before/after snapshot table for rollback.

**F3. Strict UUID validation** — `isCanonicalClient(id)` checks the id against the in-memory
roster loaded from `public.clients` at run start. Any element failing the check is **dropped and
counted**, never stored. This alone eliminates the class-B population going forward.

**F4. AI fallback that cannot invent ids** — the prompt stops asking for UUIDs. The model returns
`client_names: string[]` only; the server resolves each name against the canonical roster by
normalized exact-name then alias match. Unresolvable names are logged and discarded. The AI can
therefore never write an id, only nominate a candidate the server already trusts.

**F5. Provenance on every element** — stored shape becomes
`{ id, name, relevance, match_method: 'keyword'|'ai_name_resolved'|'both', matched_keywords: string[], matched_field: string }`.
Backward-compatible: existing readers use only `id`/`name`/`relevance`. Consumers to re-verify
before rollout: `src/services/news/api.ts`, `use-client-spotlight`, `use-report-data`,
`process_content_notifications`, `portal-sender/content/digital.ts`.

**F6. Rollout order** — (1) sentinel deny-list patch (C4A.2, isolated), (2) shared matcher +
UUID validation + AI-name resolution behind a per-function flag, (3) keyword curation after
business sign-off, (4) shadow-run comparing old vs new tags on new articles for one week with no
write change, (5) enable, (6) only then discuss historical re-derivation.

No code was written.

## Final output

```
RESOLVED DIGITAL UNIVERSE                    900  (A=751 canonical UUID + B=149 exact-name-only, C=0, D=0)
751/900 DISCREPANCY RESOLVED                 PASS

FULL-UNIVERSE P1                               3
FULL-UNIVERSE P2                             776
FULL-UNIVERSE P3                               0   (no provenance field exists)
FULL-UNIVERSE P4                             121   (was understated as 1)
FULL-UNIVERSE P5                              91   (P4∩P5 = 22)

FULL-UNIVERSE S1                               1  (0 new)
FULL-UNIVERSE S2                              57  (56 new)
FULL-UNIVERSE S3                              92  (91 new)

KEYWORD REVIEW READY                         YES  (4 items flagged BUSINESS DECISION REQUIRED)
SENTINEL DENY-LIST READY                     YES  (6 exact strings, 31,596 rows)
PROSPECTIVE MATCHER PLAN READY               YES

C4A.1 CLOSED                                 YES
C4A.2 SENDER HYGIENE PATCH READY             YES  (awaiting authorization)
C4B BULK DRY-RUN AUTHORIZED                  NO
```

STOP. READ ONLY.
