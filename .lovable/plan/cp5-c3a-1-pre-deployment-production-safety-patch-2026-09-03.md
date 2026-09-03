# CP5-C3A.1 — Pre-Deployment Production-Safety Patch

Source + tests only. No deployment, no invocation, no DB/secret/schema/cron changes. Gates stay `PORTAL_SENDER_ALLOW_APPLY=false`, `PORTAL_SENDER_TEST_MODE=false`.

## Correction 1 — Never emit internal analysis-failure summaries

In `supabase/functions/portal-sender/content/digital.ts`:

- Add an explicit, exact sentinel deny-list constant (in `content/types.ts`) containing only the proven value `Error en el servicio de análisis`.
- Summary emission becomes: trim, then omit when empty, and omit when the trimmed value matches a sentinel exactly (case-normalized full-string comparison only — no substring/fuzzy "contains error" rule).
- Omitted sentinel is not fabricated, not replaced, and not copied into `metadata` (no client-visible echo of the internal error text).
- `title`, `body_text`, `category`, `article_url`, `image_url`, `sentiment*`, `mentions`, and metadata behavior are untouched.

## Correction 2 — Restore the legacy clients response contract

In `supabase/functions/portal-sender/handler.ts`, the response `base` object currently always includes `kind` and conditionally `source_id_report`. Change so that:

- `kind = clients` (and `kind` absent) returns exactly the pre-C3A field set: no `kind`, no `media`, no `source_id_report`.
- `kind = content` keeps `kind`, `media: "digital"`, and `source_id_report` when present.
- All other behavior (validation, batching, path selection, signing, diagnostics gating, accepted-batch gating, finalize, error branches) is unchanged. No unrelated refactoring.

Internal dispatch keeps using the `kind` variable; only the emitted response shape changes.

## Tests

`supabase/function-tests/portal-sender/digital_content_test.ts`:
- valid summary → emitted
- `null` summary → omitted
- empty/whitespace summary → omitted
- `Error en el servicio de análisis` (and whitespace-padded form) → omitted, and absent from `metadata`
- a legitimate article whose title/body mentions "error" → summary still emitted (proves no fuzzy rule)
- content responses still carry `kind`, `media`, `source_id_report`

New/updated legacy regression test:
- `kind` absent and `kind: "clients"` responses contain no `kind`, `media`, or `source_id_report` keys, and their key set matches the documented pre-C3A contract
- clients path, batch body, signing headers and finalize path unchanged

Existing `auth_test.ts` and `finalize_test.ts` expectations for clients responses updated only where they asserted the C3A-added fields.

## Verification and report

Re-run the full suite (auth, signing vector, clients sender, finalize, Digital) plus `deno check` on the runtime bundle, then report:

- total tests passed/failed
- full SHA-256 of `handler.ts`, `content/digital.ts`, `content/types.ts`
- exact files changed in C3A.1
- confirmation of zero deployment, zero invocation, zero state changes
- re-mapped pilot preview for `bd4d1c76-228b-4246-a544-cac2e3d44373`: title `Fitch mantiene la nota a deuda de Metropistas`, summary OMITTED, mentions PROMESA + Metropistas, source identities = 2, canonical resolved = 2, unresolved = 0 (PROMESA retained)

STOP after tests and report.
