

## Plan: Restrict Configuracion to Admins + Allow Admin Password Editing

### Changes Overview

Two changes are needed:

1. **Hide and block "Configuracion" for data_entry users** -- they should not see the sidebar link nor access any `/ajustes` route.
2. **Allow admins to edit user passwords** -- add a password field to the edit form and create an edge function to update passwords via the Supabase Admin API.

---

### Part 1: Block Configuracion for data_entry users

**File: `src/components/layout/Sidebar.tsx`**
- Import the `useAuth` hook and fetch the user's role (reuse the same pattern from ProtectedRoute)
- Conditionally hide the "Configuracion" menu item when the user's role is `data_entry`

**File: `src/routes/protectedRoutes.tsx`**
- Change the `/ajustes` route to use `adminOnly: true`: `createProtectedRoute(lazyRoutes.Ajustes, true)`

**File: `src/routes/configurationRoutes.tsx`**
- Change ALL `ajustes/*` routes to pass `adminOnly = true`: `createProtectedRoute(settingsRoutes.XXX, true)`
- This ensures that even if a data_entry user navigates directly to an `/ajustes/...` URL, they get redirected to home

---

### Part 2: Admin can edit user passwords

**New edge function: `supabase/functions/update-user-password/index.ts`**
- Accepts `{ user_id, password }` in the request body
- Verifies the caller is an administrator (same pattern as `create-user`)
- Uses the Supabase Admin API (`adminClient.auth.admin.updateUserById`) to update the password
- Returns success or error

**File: `src/services/users/userService.ts`**
- Add a new function `updateUserPassword(userId: string, password: string)` that invokes the `update-user-password` edge function

**File: `src/components/settings/users/UserForm.tsx`**
- Show the password field when editing (currently hidden with `!editingUser`)
- Make it optional -- if left blank, password is not changed
- Label it clearly: "Nueva contraseña (dejar en blanco para no cambiar)"

**File: `src/components/settings/users/UsersContainer.tsx`**
- Update `handleUpdateUser` to also call `updateUserPassword` when a password is provided in the form data

---

### Technical Details

**Sidebar role check approach:**
The sidebar will query `user_profiles` for the current user's role on mount (or use a shared context/hook if one exists). The "Configuracion" link will only render for administrators.

**Edge function `update-user-password`:**
```text
1. Verify Authorization header
2. Verify caller has 'administrator' role via has_role RPC
3. Parse { user_id, password } from body
4. Call adminClient.auth.admin.updateUserById(user_id, { password })
5. Return result
```

**UserForm password field when editing:**
- The field appears but is optional
- Zod schema already allows empty string for password
- The submit handler will only include password in the update payload if it's non-empty

**Route protection summary:**
- `/ajustes` and all `/ajustes/*` sub-routes get `adminOnly = true`
- ProtectedRoute already handles redirecting non-admins to `/`
- Sidebar hides the link entirely for data_entry users so they never see it

