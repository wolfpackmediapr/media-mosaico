

## Fix: Admins Unable to Add New Users

### Root Cause Analysis

Three issues prevent admins from successfully adding new users:

1. **Session hijacking on signUp**: `supabase.auth.signUp()` automatically signs in as the new user, logging out the admin. The admin loses their session and gets redirected to the login page.

2. **Missing `user_roles` entry**: When a new user is created, the `handle_new_user_profile` trigger creates a `user_profiles` row but does NOT create a corresponding `user_roles` row. All authorization checks (`get_users_email`, `delete_user`, RLS policies on `feed_sources`, etc.) use the `has_role()` function which queries `user_roles` -- not `user_profiles`.

3. **Role duplication mismatch**: The `user_profiles.role` column stores a role string, but it is never consulted for authorization. The `user_roles` table is the real authority, creating a confusing gap.

### Plan

#### 1. Create an edge function for admin user creation

Instead of calling `supabase.auth.signUp()` from the client (which hijacks the session), create a new edge function `create-user` that uses the Supabase Admin API (`supabase.auth.admin.createUser()`). This:
- Keeps the admin's session intact
- Creates the auth user without triggering a sign-in
- Can also insert the `user_roles` entry in the same operation

**New file:** `supabase/functions/create-user/index.ts`
- Accepts `{ email, password, username, role }` in the request body
- Verifies the caller is an administrator (via `has_role`)
- Calls `supabase.auth.admin.createUser()` with the service role key
- Inserts a row into `user_roles` with the chosen role
- Returns the new user data or error

#### 2. Update the `handle_new_user_profile` trigger to also insert into `user_roles`

Modify the existing `handle_new_user_profile()` function to also insert a default `user_roles` entry (defaulting to `'data_entry'`). This ensures that any user created through any path (direct signup, admin creation, etc.) always gets a `user_roles` row.

**Database migration:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), 
          COALESCE(NEW.raw_user_meta_data->>'role', 'data_entry'));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'data_entry')::user_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;
```

#### 3. Backfill missing `user_roles` entries

Some existing users in `user_profiles` may not have corresponding `user_roles` entries. Run a one-time data insert to sync them.

```sql
INSERT INTO user_roles (user_id, role)
SELECT id, role::user_role FROM user_profiles
WHERE id NOT IN (SELECT user_id FROM user_roles)
ON CONFLICT (user_id, role) DO NOTHING;
```

#### 4. Update the client-side `createUser` in `userService.ts`

Change `createUser()` to call the new `create-user` edge function instead of `supabase.auth.signUp()`.

```typescript
export async function createUser(email, password, username, role) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await supabase.functions.invoke('create-user', {
    body: { email, password, username, role },
  });
  // handle response...
}
```

### What Will NOT Change

- No changes to TV, Prensa Escrita, or Radio tabs
- No changes to any UI components except `userService.ts` (the service layer for user management)
- No changes to RLS policies on any content tables
- The `UserForm.tsx`, `UsersList.tsx`, `UsersContainer.tsx` components remain untouched

### Technical Summary

| Change | File/Location | Type |
|--------|--------------|------|
| New edge function | `supabase/functions/create-user/index.ts` | New file |
| Update trigger | `handle_new_user_profile()` DB function | Migration |
| Backfill roles | One-time SQL insert | Migration |
| Update service | `src/services/users/userService.ts` | Edit |

