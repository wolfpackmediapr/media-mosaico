## Bug 2 audit: Search fails to find existing clients — CONFIRMED

### Root cause (verified in code)

The search in Ajustes → Clientes is **client-side only, over the current page**, not a database query.

`src/services/clients/clientService.ts` → `fetchClients(page, pageSize=10, ...)` pulls one page of 10 rows ordered by name. `src/components/settings/clients/ClientsContainer.tsx` (line 142) then filters those 10 rows in JS:

```ts
if (searchTerm && !client.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
```

Consequences:
1. **Most matches are invisible.** A client on page 3 will never appear when you type their name on page 1 — the search only sees the 10 rows already loaded.
2. **Keywords/aliases aren't searched.** Only `client.name` is checked; `keywords[]` and `subcategory` are ignored, even though those are the "alternate names" operators rely on.
3. **Inactive clients are hidden by default.** After the last fix, `filterStatus` defaults to `"active"`, so searching for a deactivated client returns nothing until the user switches Estado to Inactivos/Todos.

Case sensitivity itself is fine (`toLowerCase` on both sides), and there's no stale index — the search simply never reaches the database.

### Fix

Move the search to the server, broaden it to keywords, and stop hiding inactive rows when the user is actively searching.

1. **`src/services/clients/clientService.ts` — `fetchClients` signature**
   - Add `search?: string` and `status?: 'active' | 'inactive' | 'all'` params.
   - Build the query with `.or(...)` using `ilike` across `name`, `subcategory`, and `keywords` (array contains via `cs.{term}` or an `ilike` on `keywords::text` — use `keywords::text ilike %term%` via `.or` to keep it simple and index-free).
   - Apply the same filter to the `count` query so pagination is correct.
   - When `search` is present, ignore `status` (search across all rows) so a user typing an exact inactive name still finds it.

2. **`src/hooks/use-clients-query.ts`** (or wherever `useQuery` for clients lives — will locate during build)
   - Include `searchTerm`, `filterCategory`, `filterStatus` in the query key and pass them to `fetchClients`.
   - Debounce `searchTerm` (~350ms) before it hits the query key to avoid a request per keystroke.

3. **`src/components/settings/clients/ClientsContainer.tsx`**
   - Remove the local `name.includes` filter; keep only UI state.
   - Reset `currentPage` to 1 when `searchTerm`, `filterCategory`, or `filterStatus` changes.
   - Keep category filter server-side too (pass to `fetchClients`) so pagination counts stay consistent.

4. **UX polish in `ClientFilter.tsx`**
   - Small helper text or badge under the search input: "Buscando en nombre, subcategoría y palabras clave" so it's clear aliases are covered.

### Out of scope
- No schema changes. The existing `clients_name_ci_uidx` and `keywords text[]` are sufficient; a trigram index can be added later if search becomes slow at scale.
- No changes to how clients are deleted or deduplicated (handled in Bug 1).

### Verification
- Type an exact name that lives on page 3+ → row appears.
- Type a substring of a `keywords` entry → matching client appears.
- Type an inactive client's exact name with Estado = Activos → row still appears (search overrides status).
- Clear search → paginated list returns with correct total count.
