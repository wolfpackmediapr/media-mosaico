## Problem
In `Ajustes > Clientes`, the *Palabras clave* column renders every keyword as a stacked badge. Clients like AES have 30+ keywords, which stretches the row vertically (hundreds of px tall) and visually distorts the table.

## Fix
Update `src/components/settings/clients/ClientsTable.tsx` only — UI/presentation change, no business logic.

1. **Cap visible keywords**: show the first 6 badges inline; collapse the rest into a `+N` badge.
2. **Expand on demand**: clicking `+N` opens a `Popover` (shadcn) listing all keywords as wrapped badges, so the row stays compact but full data is accessible.
3. **Constrain column**: widen the keywords cell container to `max-w-[320px]` with `flex-wrap gap-1`, and add `align-top` to the row cells so short cells (Nombre, Categoría, Estado, Fecha) sit at the top instead of vertically centered against tall rows (defensive — minimizes distortion if a row still grows).
4. **Truncate long keyword text**: add `max-w-[160px] truncate` to each badge so a single very long keyword (e.g. "Comité Diálogo Ambiental de Salinas") doesn't force a multi-line badge.

## Out of scope
- No changes to data fetching, services, or the form dialog.
- No column reordering or new columns.
- No changes to other settings tables.

## Verification
Reload `/ajustes/clientes`, confirm AES row is ~1 line tall with `Applied Energy Services, AES, AES Puerto Rico, cenizas Guayama, cenizas Peñuelas, cenizas de carbón +N`, and that clicking `+N` reveals the full list in a popover.
