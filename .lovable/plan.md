## Bug 4 audit: "Misspelled keywords cannot be edited" — MOSTLY FALSE

### What the bug report assumes vs. what the app actually does

The report assumes keywords live in a separate table with a name field and foreign-key references from news/alerts. That is not the architecture here.

- `clients.keywords` is a Postgres `text[]` column on the `clients` row itself — verified in `src/services/clients/clientService.ts` and used inline by the analysis prompts.
- News matching and alerts read `clients.keywords` at analysis time; nothing stores a keyword id anywhere else. That means:
  - **Editing is already supported.** Open the client in Ajustes → Clientes → Editar; the "Palabras clave" `TagsInput` lets you remove any tag and add a corrected one. Saving persists the whole array.
  - **No cascade is needed.** There are no foreign keys to update; future analyses pick up the corrected list automatically.
  - **No dedicated merge tool is needed.** "Merging misspelled into correct" is just: delete the wrong tag, keep the right one, save.

So there is no data-integrity bug and nothing to change in the database or edge functions.

### The real UX gap (worth fixing, small)

`src/components/ui/tags-input.tsx` renders each tag as a static badge with an X button. To correct a typo the user must delete the tag and retype the whole word — with long names that feels like "can't edit". This likely fueled Johanna's report.

Proposed UX-only improvement (frontend, no schema, no data migration):

1. **`src/components/ui/tags-input.tsx`**
   - Make each tag click-to-edit: clicking the tag text swaps the badge for a small inline `<input>` prefilled with the current value.
   - Enter / blur commits the edit (updates the array at that index; case-insensitive dedupe against the rest); Escape cancels; empty value removes the tag.
   - Keep the existing X button for quick delete.
   - Preserve current behavior for the trailing draft input, comma/Enter handling, and `commit()` imperative handle so `ClientForm` doesn't need changes.

2. **Copy tweak in `ClientForm.tsx`**
   - Update the helper text under the tag input to mention that tags are click-to-edit, so operators discover the affordance.

That's the whole change — one component, one line of copy. No migration, no edge function, no cascade logic.

### Out of scope (intentionally not doing)
- Introducing a global `keywords` table or ids.
- A cross-client merge tool. Keywords are scoped per client; a global merge would change semantics and isn't requested here.
- Retroactively re-tagging historical `news_articles` / `client_alerts`. Those already reference clients by `client_id`, so renaming a keyword doesn't orphan anything; historical matches simply reflect the keywords active at analysis time, which is the correct audit behavior.

### Verification
- Open a client with a typo'd tag, click the tag, edit inline, press Enter → tag updates in the array; Save persists.
- Try to rename a tag to another existing tag on the same client → change is rejected silently (dedupe) or replaces (whichever matches existing dedupe rule); no duplicate entries.
- Empty out a tag and press Enter → tag is removed.
- Escape while editing → original tag restored.
