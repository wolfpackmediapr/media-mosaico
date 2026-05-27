
## Goal

Eliminate the need for users to add duplicate accented / non-accented keyword variants (e.g. `Pérez` and `Perez`) for client matching. Fix the only place where matching is currently accent-sensitive, consolidate normalization logic into one shared helper, and add a small UX hint in the client form so users know they don't need to duplicate.

## Changes

### 1. New shared helper — `supabase/functions/_shared/textNormalize.ts`

Deno-compatible module exporting:

- `normalizeText(s: string): string` — lowercase + NFD strip diacritics + collapse non-word chars to spaces + trim. Same logic already in `createClientMatchNotifications.ts` and `social/clientMatcher.ts`.
- `matchesKeyword(haystack: string, keyword: string): boolean` — normalizes both sides and does a word-boundary regex test (Unicode-safe lookarounds, same pattern as `social/clientMatcher.ts`).

Single source of truth for accent/case-insensitive matching on the edge-function side.

### 2. Frontend mirror — `src/lib/textNormalize.ts`

Identical `normalizeText` / `matchesKeyword` for browser code. Refactor:

- `src/services/notifications/createClientMatchNotifications.ts` → import `normalizeText` from `@/lib/textNormalize` (remove local `normalize`).
- `src/services/social/clientMatcher.ts` → import `normalizeText` + `matchesKeyword` (remove local copies, keep `stripHonorifics` + `MIN_KEYWORD_LEN` logic local since it's matcher-specific).

No behavior change in these two files — pure refactor.

### 3. Fix accent-sensitive bug — `supabase/functions/process_content_notifications/index.ts`

Around line ~244 today:

```ts
contentText.toLowerCase().includes(keyword.toLowerCase())
```

Replace with the shared `matchesKeyword(contentText, keyword)`. This makes `Pérez` match content containing `Perez` and vice versa, and adds word-boundary safety so `paz` no longer matches `capaz`.

Import the helper from `../_shared/textNormalize.ts`.

### 4. UX hint — `src/components/settings/clients/ClientForm.tsx`

Update the helper text under the keywords `TagsInput` from:

> "Ingrese palabras clave separadas por comas. Estas se utilizarán para identificar el contenido relevante para este cliente."

to:

> "Ingrese palabras clave separadas por comas. Los acentos y mayúsculas no son necesarios — por ejemplo, `Pérez` también encuentra `Perez`."

Pure copy change.

## Out of scope (deferred)

- Generated `keywords_normalized` column + trigger (step 3 of prior proposal).
- Migration to dedupe existing duplicate accent variants (step 5).

Can be added later if users still report duplicates after this lands.

## Verification

- After deploy, re-run a known article that mentions `Pérez` against a client whose keyword is `Perez` (or vice versa) and confirm a notification is created by `process_content_notifications`.
- Check edge-function logs for the function — no new errors.
- Confirm TV / Radio / Social / Digital pipelines unchanged (refactor is behavior-preserving).
