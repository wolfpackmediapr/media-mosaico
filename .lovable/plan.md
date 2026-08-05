# Client Taxonomy v2: Multi-Subcategory, Keywords UX, Aliases

Keeps the current Client Categories system intact. Three additive changes plus a verification pass.

## 1. Multiple subcategories per client

One primary category stays required. Subcategories become zero-or-many.

- New table `client_subcategory_assignments` (`id`, `client_id`, `client_subcategory_id`, `created_at`) with a unique constraint on `(client_id, client_subcategory_id)` and cascade delete on both foreign keys.
- Migration copies every existing `clients.client_subcategory_id` into the junction table, so no current selection is lost. The old column stays in place as a read-only fallback and is no longer written by the form.
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
- Aliases join name, category, subcategories, and keywords in the client context passed to AI relevance matching, and in the local keyword matcher used for client spotlight and alerts.

## 4. Verification

- AES currently has primary category Energía and subcategory Productores de Energía; the migration carries exactly that one assignment across. No extra subcategories are added anywhere.
- After the migration, confirm the news `categories` table contents are unchanged and that no client category or subcategory was written into it.

## Technical notes

- Migration order per table: create, grant to `authenticated`/`service_role`, enable RLS, then policies matching the existing `client_subcategories` policy shape.
- Backfill runs in the same migration: `INSERT INTO client_subcategory_assignments (client_id, client_subcategory_id) SELECT id, client_subcategory_id FROM clients WHERE client_subcategory_id IS NOT NULL`.
- `clientService.ts` gains subcategory-assignment reads (nested select) and a write path that diffs assignments on save; `clientCategoriesService.ts` gains usage counts from the junction table.
- Frontend touchpoints: `ClientForm.tsx`, `ClientsTable.tsx`, `ClientFilter.tsx`, `ClientsContainer.tsx`, `ClientsList.tsx`, `tags-input.tsx`.
- Edge functions are touched only where they build client context for prompts.