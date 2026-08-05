# Client Categories: review of the current system vs. the proposed plan

## 1. What exists today (verified)

**Two unrelated things both called "categoría":**

- `categories` table (`name_es` / `name_en`) — the 18 **news** categories (POLITICA, SALUD, TRIBUNALES...). Used to classify articles, transcriptions, clippings. Managed in Ajustes > Categorías. This one is fine.
- `clients.category` and `clients.subcategory` — plain `text` columns on the clients table. No table, no foreign key, no validation.

**The client taxonomy is broken in three concrete ways:**

1. **The form and the data disagree.** `ClientForm.tsx` offers exactly 6 hardcoded options (GOBIERNO, EMPRESA, ONG, EDUCACION, SALUD, OTRO), but the 26 clients in the database carry 13 distinct values — ALCOHOL, AMBIENTE, AUTOS, CARRETERAS, COMIDA, COMUNIDAD, ENERGIA, TELEVISION and others that the form cannot even produce. Editing one of those clients and saving silently forces it into one of the 6.
2. **Subcategory is a free-text box.** Result: `Farmacéutica` and `Farmacéuticas` as two separate values; `EMPRESA/Energía` and `ENERGIA/Energía` describing the same thing. Nothing can be reliably filtered or grouped.
3. **These values are half news-category, half industry.** AMBIENTE, COMUNIDAD, GOBIERNO are news topics; AUTOS, ALCOHOL, SALUD are industries. That mix is exactly the problem you're describing — they came from the alert-categorization system, not from the clients.

**Where the client category is actually consumed:**

- `ClientsTable.tsx` badge, the Ajustes > Clientes category filter, `ClientSpotlightCard/Dialog`.
- **Prensa Escrita AI prompt**: `process-press-pdf-filesearch` and `process-press-pdf` group clients by `client.category` and feed that grouping to Gemini. So the messy taxonomy is currently degrading client matching on press.
- TV and Radio prompts use only name + keywords — they ignore `category` entirely.

So the field is low-risk to restructure: no ingestion, no alerts and no history depend on it.

## 2. Opinion on the proposed .md plan

**The diagnosis and the direction are right.** Separating "what is this news about" (news categories) from "what industry is this client in" (client categories) is the correct model, and the document is careful in the right places: it does not touch the news taxonomy, it forbids auto-populating client categories from news categories, and it insists on a reversible, idempotent seed. The Publimedia taxonomy itself (32 categories, ~130 subcategories) is well-suited to Puerto Rico and covers every current client.

**Where I'd push back:**

| Plan says | My recommendation |
|---|---|
| Two tables + a `client_subcategory_assignments` junction table | Agree on `client_categories` + `client_subcategories`. The junction table is worth it only if a client really needs multiple subcategories — with 26 clients it adds real complexity. I'd start with multi-select via junction only if you confirm you need it; otherwise a single `client_subcategory_id`. **Your call — see question below.** |
| Keep the old `clients.category` text column untouched | Keep it for one release as a read-only "legacy" value so nothing breaks, then drop it in a follow-up once every client is reclassified. Leaving two category fields forever is how this drift happened in the first place. |
| Reorder, archive, usage counts, search in Settings | All good, but that's a lot of admin UI for 32 rows. I'd ship create/edit/activate + usage count first and defer drag-reorder (a `sort_order` number field is enough). |
| "Map existing clients only on exact alias match, leave the rest unassigned" | Too conservative here. With only 26 clients I'd hand-map all of them in the migration (SALUD/Hospitales -> Salud/Hospitales, ENERGIA -> Energía, TELEVISION/Medios -> Comunicaciones/Canales de TV, etc.) and show you the mapping for approval before it runs. Zero clients should be left unclassified. |
| "Remove hardcoded client-industry lists from prompts" | Correct and important — but the bigger prompt win is that TV and Radio don't send category at all today. Sending category + subcategory there is a real improvement in client relevance, not just a cleanup. |
| Screenshots in the implementation report | Skip; you'll see it in the preview. |

**What the plan is missing:**

- **Inactive clients.** No AI path filters `clients.is_active` today (4 of 26 clients are inactive and still fed to every prompt). Worth fixing in the same pass since we're touching all the client-loading code.
- **Aliases.** The plan mentions "known aliases if currently supported" — they are not supported. Aliases would help matching more than subcategories do (e.g. "AEE"/"LUMA"/"Autoridad de Energía Eléctrica"). Consider an `aliases text[]` column alongside keywords.
- **Renaming the news label.** Relabeling Ajustes > Categorías to "Categorías de Noticias" is a one-line UI change and removes the ambiguity permanently. Include it.

## 3. Recommended scope, in order

**Phase 1 — Data model and seed**
`client_categories` + `client_subcategories` tables with slug, `is_active`, `sort_order`, RLS (all authenticated read active; administrators write). Seed the full Publimedia August 3 taxonomy with stable slugs. Add `client_category_id` (and subcategory link) to `clients`, keeping the old text column as legacy.

**Phase 2 — Admin and client forms**
New Ajustes > Categorías de Clientes screen (list, create, edit, activate/deactivate, client usage count, no delete when in use). Client form gets a "Clasificación del Cliente" section: searchable category select, subcategory select filtered by category, keywords unchanged. Relabel the news screen to "Categorías de Noticias".

**Phase 3 — Reclassify the 26 existing clients**
I present the proposed mapping for every client, you approve, migration applies it.

**Phase 4 — Filters, display and AI prompts**
Category/subcategory filters and badges in Ajustes > Clientes. Then update the client blocks in `process-press-pdf-filesearch`, `process-press-pdf`, `process-tv-with-gemini`, `process-tv-with-qwen`, `analyze-tv-stored` and the radio prompt builder to send name + category + subcategory + keywords, and to skip inactive clients.

**Phase 5 — Cleanup**
Drop the legacy `clients.category` / `clients.subcategory` text columns once Phase 3 is verified.

## 4. One decision I need from you

Should a client be able to hold **multiple subcategories** (e.g. a hospital that is also a health plan), or is **one subcategory** enough? Multiple means an extra junction table and a more complex form; one keeps it simple. Everything else in this plan is unaffected by the answer.