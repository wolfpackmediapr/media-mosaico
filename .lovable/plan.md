## Add "Disable Client" feature (admins only)

Allow administrators to deactivate a client without deleting it. Disabled clients are hidden from monitoring/matching logic but stay in the database for history.

### Database
- Add `is_active boolean NOT NULL DEFAULT true` to `public.clients` via migration.
- No RLS change needed (existing policies already restrict writes to authenticated users; admin-only enforcement happens in the UI + we'll tighten the UPDATE policy to require `has_role(auth.uid(), 'administrator')` for toggling).

### Backend / service layer
- `src/services/clients/clientService.ts`:
  - Add `is_active?: boolean` to the `Client` interface.
  - Add `setClientActive(id, isActive)` helper that updates the flag.
  - Update `fetchClients` to return the flag (already returns `*`, just types).

### UI changes (admin-only)
- `ClientsContainer.tsx`: read current user role (via `has_role` / existing `useAuth`), add `toggleActiveMutation` calling `setClientActive`, pass `isAdmin` and handler down.
- `ClientsList.tsx` + `ClientsTable.tsx`:
  - New column "Estado" with a `Badge` (Activo / Inactivo) and a `Switch` (admins only) to toggle.
  - Visually dim disabled rows (muted text).
  - Optional filter chip "Mostrar inactivos" (default off) in `ClientFilter`.
- Non-admin users see the Estado badge but no toggle, no edit/delete.

### Downstream consumers
- Anywhere clients are loaded for matching (RSS analysis, notification preferences, dashboards) should filter `is_active = true`. I'll grep for `from('clients')` and add `.eq('is_active', true)` where appropriate, while leaving the Settings list showing all (with filter).

### Out of scope
- Cascade behavior on existing alerts/notification_preferences (kept as-is; disabling just stops new matches).

Confirm and I'll implement.