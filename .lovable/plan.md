# Make "Inicio" a toggleable section permission

Currently "Inicio" is hardcoded as always-available for signed-in users. Admins want to be able to remove it too, and when a data_entry user lacks Inicio they should land on the first section they *do* have access to.

## Changes

### 1. `src/hooks/use-section-permissions.ts`
- Remove the special case `if (section === "inicio") return true;` inside `canAccess`. Inicio becomes a normal permission gated by the `user_section_permissions` table (admins still bypass via role).
- Add a derived helper `firstAccessibleSection()` that returns the first key from `ALL_SECTIONS` (in declared order) the user can access, or `null` if none.

### 2. `src/components/settings/users/UserForm.tsx`
- Stop filtering out `inicio` from the checkbox grid: render the Inicio checkbox alongside the other sections so admins can toggle it.
- Update the helper copy to remove "Inicio y Ayuda están siempre disponibles" — only Ayuda remains always-on (it isn't in `ALL_SECTIONS`).
- Default permissions for a brand-new data_entry user keep including `inicio` (current behavior of pre-checking every section), so nothing changes unless the admin unchecks it.

### 3. `src/components/auth/ProtectedRoute.tsx`
- When a signed-in user hits `/` (Inicio) but lacks the `inicio` permission, redirect to their first accessible section instead of looping back to `/`.
- Add a small `HomeRedirect` behavior: if `section === "inicio"` and the user cannot access it, `Navigate` to `/${firstAccessibleSection}` (mapping section keys to routes). If no section is accessible, redirect to `/ayuda` (always available) so they aren't stranded.

### 4. Section key → route mapping
Add a tiny map (in the hook file or a new `src/lib/section-routes.ts`) so the redirect knows where to send users:

```text
inicio          -> /
publiteca       -> /publiteca
tv              -> /tv
radio           -> /radio
prensa          -> /prensa
prensa-escrita  -> /prensa-escrita
redes-sociales  -> /redes-sociales
notificaciones  -> /notificaciones
envio-alertas   -> /envio-alertas
reportes        -> /reportes
```

### 5. Post-login landing
`src/pages/Auth.tsx` currently sends users to `/` (or the stored `redirectAfterLogin`). The ProtectedRoute redirect handles the follow-up bounce automatically, so no change is required there — but I'll double-check the login flow doesn't loop.

## Out of scope
- Ayuda stays always-available (it's not a gated section).
- Admin behavior is unchanged (they always see everything).
- No DB migration needed — `user_section_permissions` already accepts `inicio` as a value.

## Verification
- Admin edits a data_entry user, unchecks Inicio, keeps Radio → user logs in, is redirected from `/` to `/radio`, sidebar hides Inicio.
- Uncheck everything → user lands on `/ayuda`.
- Re-check Inicio → user lands on `/` normally.
