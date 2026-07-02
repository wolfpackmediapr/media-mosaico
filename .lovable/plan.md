## Problem

The Acciones column (Edit/Delete) in Gestión de Clientes is only reachable by scrolling the table horizontally. Users don't realize it's there.

## Fix

Make the Acciones column **sticky to the right edge** of the table so Edit/Delete are always visible regardless of horizontal scroll.

### Changes to `src/components/settings/clients/ClientsTable.tsx`
- Add `sticky right-0 bg-background` (plus a subtle left border/shadow for visual separation) to both the Acciones `<TableHead>` and its `<TableCell>` in every row.
- Keep the existing `overflow-x-auto` wrapper so the rest of the table can still scroll under the pinned column.
- Ensure the sticky cell background matches row hover/inactive states so it doesn't look transparent over scrolled content.

### Optional tightening (same file, low risk)
- Reduce the inline keyword preview from 6 badges to 4 to shrink the natural table width, so most viewports won't need to scroll at all.

No other files, no data/logic changes.