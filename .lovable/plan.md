# Fix: "Deleted clients remain duplicated" — approved plan

## Diagnosis (from audit)
- `clients` has no soft-delete column; `deleteClient()` is a hard `DELETE`, so truly deleted rows cannot reappear.
- No exact duplicates in the DB, but two near-duplicate pairs exist because admins re-added instead of edited:
  - `Coop de Seguros Múltiples` (2025-01) vs `Cooperativa Seguros Múltiples` (2026-07)
  - `NF Energía` (2025-01, inactive) vs `NF Energy` (2026-05)
- No unique constraint on `name`, and the Gestión de Clientes table lists active + inactive together, which is why deactivated rows look like duplicates of their replacements.

## Merge decisions (user-approved: keep latest added)
- Keep **`Cooperativa Seguros Múltiples`** (2026-07-20). Merge keywords from `Coop de Seguros Múltiples` into it, then delete the older row.
- Keep **`NF Energy`** (2026-05-28). Merge keywords from `NF Energía` into it, then delete the older row.

## Steps

### 1. Migration — prevent future duplicates
```sql
CREATE UNIQUE INDEX IF NOT EXISTS clients_name_ci_uidx
  ON public.clients (lower(btrim(name)));
```
Case-insensitive, ignores leading/trailing whitespace. No `deleted_at` column added — the app's model stays hard-delete + `is_active`.

### 2. Data merge (insert tool, after migration is approved)
For each pair: union `keywords` into the winner, delete the loser.

### 3. Frontend — prevent re-introduction and clarify the list
- `src/services/clients/clientService.ts`
  - Pre-check `addClient` / `updateClient` with a case-insensitive `ilike` on `name`; block with toast: *"Ya existe un cliente con ese nombre (activo o inactivo). Edítalo en vez de crear uno nuevo."*
  - Catch Postgres `23505` (unique violation) and surface the same message.
- `src/components/settings/clients/ClientsContainer.tsx` + `ClientFilter.tsx` + `ClientsList.tsx`
  - Add an "Estado" filter: **Activos (default)** / Inactivos / Todos, so deactivated rows don't appear next to their active replacements by default.
  - Existing "Inactivo" badge / dimming stays for the "Todos" view.

### 4. Verification
- `SELECT lower(btrim(name)), count(*) FROM public.clients GROUP BY 1 HAVING count(*) > 1;` → zero rows.
- Try to create `"aaa"` from the UI → blocked with the Spanish toast.
- Gestión de Clientes defaults to Activos; the two merged pairs are gone.

## Not doing
- No `deleted_at` / soft-delete column. Introducing it would silently break 30+ existing call sites (spotlight, alerts, TV/RSS analyzers, notifications) that assume hard-delete + `is_active`.

Switch to build mode and I'll run the migration, execute the two merges, and ship the frontend guardrails.
