

## Fix: Allow Administrators to Update User Roles

### Problem

Two issues prevent you from changing a user's role:

1. **RLS Policy on `user_profiles`**: The UPDATE policy only allows users to update their own profile (`auth.uid() = id`). There's no exception for administrators.
2. **`user_roles` table not updated**: When changing a role, only `user_profiles` is updated, but the system checks permissions against `user_roles` (via `has_role()` and `get_user_role()`). The two tables get out of sync.

### Solution

#### 1. Database Migration

- Add an RLS policy on `user_profiles` allowing administrators to update any profile:
  ```
  Policy: "Administrators can update all profiles"
  Command: UPDATE
  Using: get_user_role(auth.uid()) = 'administrator'
  With Check: get_user_role(auth.uid()) = 'administrator'
  ```

- Create a trigger on `user_profiles` that automatically syncs role changes to `user_roles`:
  ```
  When user_profiles.role is updated, also update user_roles
  so both tables stay in sync.
  ```

#### 2. Code Change (userService.ts)

Update `updateUserProfile` to also update the `user_roles` table when the role changes, as a safety net alongside the trigger.

### What This Fixes

- Administrators will be able to promote/demote users between "data_entry" and "administrator"
- Both `user_profiles` and `user_roles` will stay synchronized
- No changes to the UI needed -- the existing edit form already supports role selection

### Technical Details

**Migration SQL:**
```sql
-- Allow admins to update any user profile
CREATE POLICY "Administrators can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = 'administrator')
WITH CHECK (get_user_role(auth.uid()) = 'administrator');

-- Sync trigger: keep user_roles in sync when user_profiles.role changes
CREATE OR REPLACE FUNCTION public.sync_user_role_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    UPDATE public.user_roles
    SET role = NEW.role::user_role
    WHERE user_id = NEW.id;

    -- If no row existed, insert one
    IF NOT FOUND THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, NEW.role::user_role);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_role_to_user_roles
AFTER UPDATE OF role ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role_on_profile_update();
```

**No frontend code changes required** -- the existing `updateUserProfile` function already sends the correct data; it was just being blocked by RLS.

