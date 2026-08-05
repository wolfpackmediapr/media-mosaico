# Client Taxonomy v2: Multi-Subcategory, Keywords UX, Aliases

Keeps the current Client Categories system intact. Three additive changes plus a verification pass.

## 1. Multiple subcategories per client

One primary category stays required. Subcategories become zero-or-many.

- New table `client_subcategory_assignments` (`id`, `client_id`, `client_subcategory_id`, `created_at`) with a unique constraint on `(client_id, client_subcategory_id)`. `client_id` uses `ON DELETE CASCADE`; `client_subcategory_id` uses `ON DELETE RESTRICT` so a taxonomy record can never silently drop live assignments. The admin rule stands: a subcategory in use cannot be deleted — the UI shows its usage count and offers deactivation instead.
- A database trigger validates every assignment: the subcategory's `client_category_id` must equal the client's `client_category_id`, otherwise the insert or update is rejected with a clear error. Changing a client's primary category is likewise blocked while incompatible assignments remain, unless they are removed in the same transaction.
- Saving classification is atomic through a transactional RPC `update_client_classification(client_id, client_category_id, subcategory_ids)` that checks permissions, validates every subcategory against the category, updates the primary category, replaces the assignment set, and rolls the whole thing back on any failure. The form never issues independent client and assignment writes.
- Migration copies every existing `clients.client_subcategory_id` into the junction table, so no current selection is lost. The junction table is then authoritative: the legacy column is read only when a client has zero assignments, is never merged with or allowed to overwrite assignments, is never written by the form, and every remaining read site is documented for removal in a later cleanup migration.
- Client form: the single Subcategoría dropdown is replaced by a searchable multi-select limited to subcategories of the selected primary category. Selections render as removable chips. With none selected the field shows a "Sin subcategoría" empty state — no such record is created in the database.
- Changing the primary category shows a confirmation dialog listing the subcategories that would be dropped, and clears them only after the user confirms.
- Client list and table show all assigned subcategories (first two plus a "+N" popover, matching the keywords pattern already used).
- The category/subcategory filter matches clients that have the selected subcategory in the junction table.
- AI prompt builders that send client context (TV, Radio/Qwen, Prensa Escrita, RSS, notifications) send the full subcategory list instead of a single value.

## 2. Keywords UX in the client form

No keyword data is changed, added, or removed by this work.

- Keywords collapse to the first 12 by default with a "Ver todas las palabras clave (+N)" toggle that expands and collapses the full list.
- A search box above the list filters the visible keywords as you type; adding and removing individual keywords keeps working in both states.
- Total count is displayed next to the label (for example "Palabras clave · 123").
- The expanded list scrolls inside its own bounded area, and the modal gets a sticky footer so Guardar and Cancelar stay reachable without scrolling past the keywords.

## 3. Aliases

- New `aliases text[]` column on `clients`, default empty, separate from `keywords`. Nothing is auto-migrated from keywords.
- The client form gets its own Aliases tag input above Keywords, labeled for alternate names, abbreviations, and legal names.
- Aliases join name, category, subcategories, and keywords in the client context passed to AI relevance matching, and in the local matcher used for client spotlight and alerts. Local alias matching reuses the existing normalization (case, accents, punctuation) with strict word-boundary/exact-token matching, so a short alias like `AES` never matches inside a longer word. Aliases are identity strings, not general topical keywords.

## 4. Verification

- AES currently has primary category Energía and subcategory Productores de Energía; the migration carries exactly that one assignment across. No extra subcategories are added anywhere.
- After the migration, confirm the news `categories` table contents are unchanged and that no client category or subcategory was written into it.

## Technical notes

- Migration order per table: create, grant to `authenticated`/`service_role`, enable RLS, then policies matching the existing `client_subcategories` policy shape.
- Backfill runs in the same migration and is idempotent:

```sql
INSERT INTO client_subcategory_assignments (
  client_id,
  client_subcategory_id
)
SELECT
  id,
  client_subcategory_id
FROM clients
WHERE client_subcategory_id IS NOT NULL
ON CONFLICT (client_id, client_subcategory_id) DO NOTHING;
```

- `clientService.ts` reads nested subcategory assignments and performs classification writes through exactly one call to the transactional `update_client_classification` RPC. The frontend does not independently diff or write assignment rows. `clientCategoriesService.ts` gains usage counts from the junction table.
- Frontend touchpoints: `ClientForm.tsx`, `ClientsTable.tsx`, `ClientFilter.tsx`, `ClientsContainer.tsx`, `ClientsList.tsx`, `tags-input.tsx`.
- Edge functions are touched only where they build client context for prompts.