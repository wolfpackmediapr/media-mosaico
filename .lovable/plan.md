# CP5-C4A.1 — Digital Mention Provenance & Metropistas Relevance Salvage Audit

READ ONLY. No writes, no sender calls, no gate changes, no deployments were performed.

Note on universe definition: this audit resolves the Metropistas universe by canonical UUID
containment on `news_articles.clients` over Digital rows (`feed_sources.platform = 'news'` /
unmapped, excluding twitter/instagram). That yields **751 rows** (Digital total 48,714). The
C4A figure of 900 included name-string resolution and non-Digital platforms; all counts below
use the stricter 751-row canonical universe.

## 1. Writers of `news_articles.clients`

| Writer | Trigger | Active | AI | Deterministic keywords | Full roster to model | Resolves ids | Accepts model ids | Write shape | Can overwrite |
|---|---|---|---|---|---|---|---|---|---|
| `supabase/functions/process-rss-feed/index.ts` (`processArticle` → `analyzeArticle` → `mergeClientMatches`) | pg_cron ~30m + manual | Yes | Yes (Lovable AI Gateway) | Yes (`matchClientsToArticle`) | Yes — `clients.slice(0,50)` with keywords injected in prompt | Only for the keyword half | **Yes** — AI ids stored verbatim, no UUID/existence check | Full snapshot on insert | New rows only (insert path) |
| `supabase/functions/reanalyze-articles/index.ts` | Manual backfill invocation | Yes (on demand) | Yes | Yes (same matcher) | Yes (same 50-client prompt) | Partial | **Yes** | Full snapshot | **Yes — overwrites existing `clients`** |
| `supabase/functions/process-social-feeds/*` | pg_cron 60m | Yes | No | No | No | n/a | n/a | Does not write `clients` (533 twitter rows carry clients only from legacy paths) | No |
| `process_content_notifications`, `test_notification_settings` | cron / manual | Yes | No | Reads only | No | n/a | n/a | Read-only on `clients[]` | No |
| Frontend (`src/services/news/api.ts`, monitoring service) | UI | Yes | No | No | n/a | n/a | n/a | Read-only for `clients[]` | No |
| Migrations / triggers | — | — | — | — | — | — | — | Only `update_updated_at_column` touches the row | No |

Dominant producer of the current Metropistas assignments: the **`process-rss-feed` +
`reanalyze-articles` family**, specifically the deterministic `matchClientsToArticle`
substring matcher, with the AI merge layer adding a second, unvalidated entry.

Matcher semantics (verbatim behaviour): `content = (title + ' ' + description).toLowerCase()`,
match is `content.includes(keyword.toLowerCase())` — plain substring, **no word boundaries, no
accent normalization**. Relevance is assigned purely by matched-keyword count
(>=3 alta, >=2 media, else baja) — it encodes no semantic judgement.

## 2. Stored `clients` object shapes (all Digital + all rows)

Across the whole table: 50,957 rows with a JSON array, 100,654 NULL.
Element shapes observed:

| Shape | Elements | Rows |
|---|---|---|
| object `{id, name, relevance}` | 65,274 | 25,134 |
| bare string | 17 | 9 |

No other variants exist. **There is no `confidence`, `score`, `reason`, `matched_keywords`,
`keywords`, `source`, `match_method`, or any provenance field anywhere in the corpus.** The
Metropistas 751 rows use exclusively `{id,name,relevance}`. Consequence: **P3 (stored explicit
provenance) is structurally impossible — 0 rows.**

## 3. Canonical Metropistas client configuration

`clients.id = 08748447-a701-4be3-80c8-7470526e0975`, name `Metropistas`,
category `CARRETERAS`, subcategory `Infraestructura`, `is_active = true`,
`aliases = []` (empty), updated 2026-08-05.

Configured keywords (exact, 25 entries) classified analytically:

- Exact brand/name: `Metropistas`, `Abertis`, `AutoExpreso`
- Highly specific entity/location: `Puente Teodoro Moscoso`, `PR-52`, `Autopista Luis A. Ferrer`,
  `Autopista Roberto Sanchez Vilella`, `Expreso José de Diego`, `expreso Martínez Nadal`,
  `Carril dinámico`, `Cogestión vehicular`, `Tarifas de peajes`, `Aumento de peajes`,
  `Accidentes en autopistas`, `Asistencia en la carretera`, `CESCO` (specific agency, but not Metropistas)
- Moderately specific: `peaje`, `autopista`, `Autopistas`
- Broad/generic or malformed: **`carretera`**, `PR 22`, `PR 5`, `PR 20`, `PR 53`, `PR 66`
  (the space-form `PR nn` keywords are substring-fragile and near-useless; `PR 5` matches
  "PR 52", "PR 53", any "…PR 5x")

## 4. Configured-keyword evidence in Digital source text (deterministic, lowercase substring)

| Keyword | Digital matches | Metropistas-tagged | Title matches |
|---|---|---|---|
| carretera | 782 | **654** | 182 |
| PR-52 | 81 | 40 | 63 |
| CESCO | 65 | 12 | 47 |
| autopista | 63 | 56 | 35 |
| peaje | 33 | 26 | 23 |
| AutoExpreso | 22 | 17 | 16 |
| Metropistas | 9 | 3 | 5 |
| Autopistas | 8 | 6 | 2 |
| PR 5 / Martínez Nadal | 4 / 4 | 2 / 0 | 2 / 4 |
| Teodoro Moscoso | 3 | 1 | 0 |
| all remaining 14 keywords | 0–2 | 0–1 | 0–1 |

`carretera` alone explains 654 of 751 Metropistas rows (87%). It is the single contaminating term.

## 5. Reproduction of the Metropistas assignments (751 rows)

| Class | Count |
|---|---|
| P1 — direct identity (name/alias in title/description/summary) | **3** |
| P2 — deterministic configured-keyword evidence, no P1 | **747** |
| P3 — stored explicit provenance | **0** (field does not exist) |
| P4 — AI-only / unreproducible | **1** |
| P5 — bulk/suspicious (>5 clients) | **68** |
| P4 ∩ P5 | 0 |

Every assignment is reproducible from the keyword matcher. The problem is not hallucinated
tagging volume — it is that the deterministic rule itself is wrong.

Model-id contamination, measured separately: of 1,991 client elements on these rows,
**523 (26%) carry ids that do not exist in `public.clients`**, spread over 235 rows;
**195 of those fake elements are literally named "Metropistas"** with placeholder ids such as
`metropistas_uuid` and `metropistas`. This is why the fingerprints show `Metropistas|Metropistas`.

## 6. Client-set fingerprints (top 20, by name)

```
Metropistas                                                 247
Metropistas|Serrallés                                        68
Metropistas|Metropistas                                      30
Cruz Roja Americana|Metropistas                              28
Metropistas|Municipio de Naguabo                             26
AAA|Metropistas                                              23
Cruz Roja Americana|Metropistas|Serrallés                    17
Metropistas|PROMESA                                          17
Metropistas|Metropistas|Serrallés                            11
Coop de Seguros Múltiples|Metropistas|Metropistas            10
Coop|Cruz Roja|Metropistas|Metropistas                       10
AAA|Metropistas|Municipio de Naguabo                          7
Metropistas|Municipio de Naguabo|Serrallés                    7
Ética Gubernamental|Metropistas|Metropistas                   6
First Medical|Menonita|Metropistas|MMM|Pavía|Professional     6
Cruz Roja Americana|Metropistas|Metropistas                   6
Coop|Cruz Roja|Ford|Metropistas|Metropistas|Serrallés         6
Coop|Ford|Metropistas|Metropistas                             5
Metropistas|PROMESA|Serrallés                                 5
Cruz Roja|Metropistas|Metropistas|Serrallés                   5
```

No single roster is dumped en masse; sets are small (mean ~2.6 clients) and vary. This is
keyword co-firing (other clients also carry broad keywords), not full-roster dumping. The
6-client health-sector set is the classic broad-keyword co-fire pattern.

## 7. Timeline / contamination window

Metropistas tagging by `created_at`: 2025-12 (2), 2026-01 (3), 2026-02 (19), 2026-03 (99),
2026-04 (113), 2026-05 (145), 2026-06 (129), 2026-07 (101), 2026-08 (131), 2026-09 (9).

There is **no clean historical period followed by contamination**. Tagging scales with feed
volume from the moment keyword matching went live. There is no discrete backfill spike. The
defect is continuous and structural, not event-driven.

## 8. Feed-source concentration

| Feed source | Rows | contains "carretera" | summary sentinel | avg clients |
|---|---|---|---|---|
| El Nuevo Dia Web | 119 | 89 | 75 | 2.77 |
| NotiCel | 118 | 114 | 81 | 2.90 |
| Primera Hora Web | 108 | 83 | 82 | 2.37 |
| Noticel | 105 | 101 | 73 | 2.84 |
| Metro Puerto Rico | 100 | 88 | 67 | 2.33 |
| Ey Boricua | 51 | 48 | 35 | 2.33 |
| La Perla del Sur | 45 | 41 | 26 | 3.04 |
| El Vocero | 35 | 28 | 22 | 2.77 |
| Puerto Rico Posts | 26 | 25 | 18 | 2.73 |
| Metro PR | 22 | 21 | 16 | 2.36 |

No broken outlier feed. The distribution tracks each feed's overall volume — corpus-wide cause.

## 9. The three direct-text rows

1. `bd4d1c76-228b-4246-a544-cac2e3d44373` — "Fitch mantiene la nota a deuda de Metropistas",
   Sin Comillas Web, 2026-06-21. Metropistas in **title + link**. Clients: PROMESA (baja),
   Metropistas (baja). Zero unresolved. Summary = `Error en el servicio de análisis`.
   **This is the already-projected pilot row.**
2. `62c0798a-9d1a-4a00-b0dd-800da273d404` — "Piden revisar planes de tráfico en la PR-52 tras
   accidentes y quejas ciudadanas", La Perla del Sur, 2026-06-02. Metropistas named in summary
   ("…al DTOP y a Metropistas…"). Clients: Coop de Seguros Múltiples, Metropistas,
   **`metropistas_uuid`** (invalid). 1 unresolved.
3. `0d1a754e-e679-4a83-b151-15d7278d46be` — near-duplicate of #2 (variant URL, same pub_date),
   third element id `metropistas` (invalid). 1 unresolved.

Rows 2 and 3 are a **deduplication miss** as well as an invalid-id case.

## 10. Deterministic keyword-positive groups (title+description evidence, what the matcher saw)

- **K-HIGH** (`Metropistas`, `AutoExpreso`, `Abertis`, `PR-52`, `Teodoro Moscoso`, `CESCO`): **71 rows**
- **K-MEDIUM** (`peaje`, `autopista`, not already K-HIGH): **56 rows**
- **K-BROAD** (`carretera` only): **623 rows**

K-BROAD is 83% of the universe and carries no Metropistas-specific signal.
Caveat on K-HIGH: `CESCO` is a DTOP/agency term, not Metropistas — it should be reviewed out.

## 11. Manual-review sample of P4

P4 = 1 row only. No meaningful sample exists; AI-only tagging is not the failure mode here.

## 12. False-positive signal comparison

| Dimension | P1 (3) | P2 (747) | P4 (1) |
|---|---|---|---|
| avg clients | 2.7 | 2.65 | — |
| rows > 5 clients | 0 | 68 (9.1%) | 0 |
| rows with unresolved ids | 2 of 3 | 233 | 0 |
| unresolved element rate | — | 26% of all elements | — |
| `Error en el servicio de análisis` summary | 1 of 3 | 510 (68%) | — |

P4 is not materially worse — it is statistically irrelevant. The systemic damage is in P2.

## 13. Safe salvage corpus sizes

Filters applied to every policy: zero unresolved ids, ≤5 canonical clients, non-null
title/link/pub_date.

| Policy | Total rows | ≤90d | ≤365d | New rows (excluding projected pilot) |
|---|---|---|---|---|
| S1 — P1 only | **1** | 1 | 1 | **0** |
| S2 — P1 or K-HIGH | **57** | 53 | 57 | **56** |
| S3 — P1 or K-HIGH or K-MEDIUM | **92** | 70 | 92 | **91** |

(The two other direct-text rows fall out of S1 because both carry an invalid `metropistas*` id.)
No manifest was created.

## 14. Analysis-failure sentinels

| Sentinel | Source field | Mapped Portal field | Rows (whole table) | Currently filtered | Client-facing leak possible |
|---|---|---|---|---|---|
| `Error en el servicio de análisis` | `news_articles.summary` | `summary` | 29,519 | **YES** (`SUMMARY_SENTINELS` in `content/types.ts`) | No |
| `Descripción insuficiente para análisis` | `news_articles.summary` | `summary` | part of 1,687 | **NO** | **YES** |
| `Título insuficiente para análisis` | `news_articles.summary` | `summary` | part of 1,687 | **NO** | **YES** |

Both "insuficiente" strings live only in `summary` (0 occurrences in `title` or `description`),
reach the Portal DTO through the same `summary` mapping in `content/digital.ts:257`, and are not
in the sentinel list. Additionally 390 rows carry other `Error…` summaries not on the list.
No patch was applied.

## 15. Root cause

| Cause | Weight |
|---|---|
| **Overly broad keyword (`carretera`) with substring, no-word-boundary matching** | 654 / 751 rows (87%) — dominant |
| Moderately broad keywords (`autopista`, `peaje`) | ~56 rows |
| Model-generated invalid client ids accepted verbatim | 523 elements / 235 rows (26% of elements) |
| Legitimate deterministic keyword matching (K-HIGH) | 71 rows |
| Legitimate direct identity | 3 rows |
| AI hallucination as sole cause | 1 row |
| Full-roster prompt contamination | Not observed (prompt caps at 50 clients, sets are small) |
| Broken enrichment/backfill event | Not observed (continuous timeline) |
| Historical schema conversion | Not observed (single stable shape) |

Confidence is high for the keyword cause (directly measured) and high for the invalid-id cause
(directly counted). Semantic legitimacy of the remaining rows was not judged — no AI was invoked.

## 16. Production-forward recommendation

**Option D — deterministic keyword-first with a reviewed AI fallback — is the evidence-supported
choice**, implemented inside the existing internal pipeline (i.e. D layered on B), with C as a
Portal-side safety net.

Concretely, without implementing anything now:
1. Curate client keywords: remove generic terms (`carretera`, bare `autopista`, `peaje`, `PR 5`,
   `PR 20`, `PR 22`, `PR 53`, `PR 66`), keep brand/asset terms, and move CESCO off Metropistas.
2. Replace substring matching with accent-normalized, word-boundary matching.
3. Reject any AI-returned client id that is not a canonical UUID present in `public.clients`
   (this alone removes 26% of stored elements' worth of junk going forward).
4. Store provenance on each element (`match_method`, `matched_keywords`, `matched_field`) so
   future audits are reproducible without re-deriving anything.
5. Portal-side (`portal-sender`): derive/verify mentions defensively — drop unresolved ids
   (already done), and add the missing sentinels.

Rejected: A (accuracy unacceptable for a client-facing Portal), pure C (leaves Publimedia's
internal alerts and dashboards wrong), pure B without provenance (unauditable again in 6 months).

## 17. Historical repair recommendation

**Selectively repaired, then deterministically re-derived** — in that order, and only after the
prospective fix lands:
- Do not AI-reprocess 48,714 rows (cost, and it does not fix the id-validation defect).
- Step 1: purge invalid/non-UUID client elements corpus-wide — mechanical, zero judgement.
- Step 2: after keyword curation, re-derive `clients[]` deterministically for Digital rows and
  write provenance; keep a pre-change snapshot column/table for rollback.
- Step 3: leave rows with no deterministic evidence untagged rather than guessing.
- Portal exposure stays limited to re-derived, provenance-bearing rows.

## Final report

```
METROPISTAS RESOLVED UNIVERSE (canonical uuid, Digital)     751   (C4A "900" = looser resolution)

P1 DIRECT IDENTITY                                            3
P2 CONFIGURED KEYWORD                                       747
P3 STORED PROVENANCE                                          0   (no provenance field exists)
P4 AI-ONLY / UNREPRODUCIBLE                                   1
P5 BULK/SUSPICIOUS (>5 clients)                              68

TOP CLIENT-SET FINGERPRINT       [Metropistas] 247, [Metropistas,Serrallés] 68,
                                 [Metropistas,Metropistas] 30 (invalid duplicate id)
TOP SUSPECT FEED SOURCES         none isolated — proportional to feed volume
CONTAMINATION/TIMELINE FINDING   continuous since 2025-12; no clean-then-contaminated window

K-HIGH COUNT                                                 71
K-MEDIUM COUNT                                               56
K-BROAD COUNT                                               623

S1 SAFE CORPUS                                     1 (0 new)
S2 SAFE CORPUS                                    57 (56 new)
S3 SAFE CORPUS                                    92 (91 new)

ADDITIONAL SENTINEL LEAK RISK    "Descripción/Título insuficiente para análisis" —
                                 1,687 rows, summary → Portal summary, UNFILTERED, leak possible

DOMINANT ROOT CAUSE              overly broad keyword "carretera" + substring matching (87%),
                                 compounded by acceptance of model-generated invalid client ids (26% of elements)

RECOMMENDED PRODUCTION-FORWARD FIX   D (deterministic keyword-first + validated AI fallback,
                                     with curated keywords, UUID validation, stored provenance)
RECOMMENDED HISTORICAL STRATEGY      selective repair (purge invalid ids) then deterministic re-derivation
```

Verdict:

```
EXISTING STRUCTURED TAGS TRUSTWORTHY        PARTIAL
DETERMINISTIC SALVAGE POSSIBLE              YES  (57–92 rows, pending keyword review)
SAFE METROPISTAS EXPANSION POSSIBLE         NO   (not before keyword curation + id purge)
CURRENT DIGITAL MATCHING NEEDS REPAIR       YES
C4B BULK DRY-RUN AUTHORIZED                 NO
```

STOP. READ ONLY. No code, data, secrets, or gates were changed in this phase.
