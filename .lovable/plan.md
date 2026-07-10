
# Per-User Section Permissions for Data Entry Users

Yes — this fits the current infrastructure. We already have a `user_profiles` + `user_roles` model and a `ProtectedRoute` gatekeeper. We'll add a permissions layer that admins toggle per user, and enforce it in the sidebar + routes.

Administrators keep full access always. Only `data_entry` users are constrained by these checkboxes.

## Sections that can be toggled

Matches the sidebar tabs:
- Inicio (`/`)
- Publiteca (`/publiteca/*`)
- TV (`/tv`)
- Radio (`/radio`)
- Prensa Digital (`/prensa`)
- Prensa Escrita (`/prensa-escrita`)
- Redes Sociales (`/redes-sociales`)
- Notificaciones (`/notificaciones`)
- Alertas Enviadas (`/envio-alertas`)
- Reportes (`/reportes`)
- Media Monitoring (`/media-monitoring`) — already admin-only, will stay so

Ayuda stays available to everyone. Ajustes stays admin-only.

## Database changes (one migration)

New table `public.user_section_permissions`:

- `user_id uuid` → references `auth.users(id) on delete cascade`
- `section text` — one of the section keys above
- unique on `(user_id, section)`
- standard `created_at`, `updated_at`

Grants: `SELECT, INSERT, UPDATE, DELETE` to `authenticated`; `ALL` to `service_role`. No `anon`.

RLS policies:
- Users can `SELECT` their own rows (`auth.uid() = user_id`)
- Admins (via existing `has_role(auth.uid(), 'administrator')`) can `SELECT/INSERT/UPDATE/DELETE` any row

Semantics: **presence of a row = access granted**. If a `data_entry` user has no rows, they see nothing except Inicio + Ayuda (safe default). Administrators bypass this table entirely.

Optional seed: for each existing `data_entry` user, insert rows for every section so nothing changes for current users until an admin edits them.

## Frontend changes

1. **New hook `src/hooks/use-section-permissions.ts`**
   - Fetches current user's role and their granted sections
   - Exposes `canAccess(section)` — always `true` for administrators; otherwise checks the set
   - Cached via React Query

2. **`ProtectedRoute`** — accept an optional `section` prop. If set and user is `data_entry` and not permitted, redirect to `/`.

3. **`src/routes/protectedRoutes.tsx` and `publitecaRoutes.tsx`** — pass the matching `section` key to each `createProtectedRoute` call.

4. **`Sidebar.tsx`** — filter `mainMenuItems` using the same `canAccess` check so hidden sections don't render for restricted users.

5. **Users settings UI (`src/components/settings/users/UserForm.tsx` + a new `UserPermissionsPanel.tsx`)**
   - When editing a `data_entry` user, show a "Permisos de acceso" section with a checkbox per tab
   - When editing an `administrator`, show a disabled note "Los administradores tienen acceso completo"
   - Save = diff current vs selected → insert/delete rows in `user_section_permissions`
   - Available on both the "Agregar usuario" and "Editar usuario" flows (for new users, we insert after creation)

6. **`userService.ts`** — add `fetchUserPermissions(userId)` and `setUserPermissions(userId, sections[])` helpers.

## Enforcement summary

| Layer | Behavior |
|---|---|
| Sidebar | Hides tabs the user can't access |
| Route guard | Redirects direct-URL access to `/` |
| DB RLS | Users can only read their own permission rows; only admins can write |

Administrators are unaffected everywhere.

## Files touched

- `supabase/migrations/*` (new, via migration tool)
- `src/hooks/use-section-permissions.ts` (new)
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/routes/protectedRoutes.tsx`
- `src/routes/publitecaRoutes.tsx`
- `src/services/users/userService.ts`
- `src/components/settings/users/UserForm.tsx`
- `src/components/settings/users/UserPermissionsPanel.tsx` (new)
- `src/components/settings/users/UsersContainer.tsx` (wire save)

## Out of scope

- Changing admin-only routes (Ajustes, Media Monitoring, Admin) — remain admin-only
- Sub-tab / per-feature permissions inside a section (only top-level tabs for now)
- Bulk-edit permissions across many users at once
