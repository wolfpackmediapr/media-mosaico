# Harden `update_client_classification` RPC + verification suite

The classification RPC already exists and is in use by the client form. This plan tightens
its contract (locking, return value, documented order) and adds the verification tests.

## Current state (verified)

- Function signature is already `update_client_classification(p_client_id uuid, p_client_category_id uuid, p_subcategory_ids uuid[])` — parameter names are already unambiguous, no rename needed.
- It is `SECURITY DEFINER` with `search_path = public` already set.
- Execute privilege: `authenticated` yes, `service_role` yes, `anon` no (PUBLIC execute already revoked). No grant changes needed.
- It derives the actor from `auth.uid()` and never accepts a caller-supplied user id.
- It currently returns `void` and does **not** lock the client row.

## Changes

### 1. Row lock and return value (migration)

Replace the function body so the documented order is enforced exactly:

```text
1. SELECT ... FROM clients WHERE id = p_client_id FOR UPDATE   -- lock, also proves existence
2. Authorization: reject when auth.uid() IS NULL
3. Validate every id in p_subcategory_ids belongs to p_client_category_id
4. DELETE assignments not in p_subcategory_ids (removes obsolete + incompatible)
5. UPDATE clients SET client_category_id = p_client_category_id
6. INSERT requested assignments ... ON CONFLICT DO NOTHING
7. RETURN the saved classification
8. Any raised exception aborts the function, so the whole statement rolls back
```

Signature becomes `RETURNS TABLE(client_id uuid, client_category_id uuid, subcategory_ids uuid[])`
so the client can reconcile its local state from the authoritative saved rows.

Kept as-is: `SECURITY DEFINER`, `SET search_path = public`, the `auth.uid()` check, the
existing validation triggers, and the current RLS model on `clients` and
`client_subcategory_assignments`.

Because the return type changes, the migration drops and recreates the function and
re-grants execute to `authenticated` and `service_role` only.

### 2. Frontend reconciliation

`saveClientClassification` in `src/services/clients/clientService.ts` returns the RPC row so
`addClient`/`updateClient` can use the saved ids instead of assuming the input took effect.
No change to how many times it is called — the form already produces exactly one RPC call
per save.

### 3. Verification tests

Run as read-only checks and rolled-back transactional probes after the migration:

| Check | Method |
| --- | --- |
| Re-running the migration creates no duplicates | Run the backfill insert a second time; assert assignment count unchanged |
| Cross-category assignment rejected | Call the RPC with a subcategory from another category; expect `P0001` |
| Unauthorized user cannot update | Call with no session (`auth.uid()` null); expect `P0001` |
| Failed assignment update rolls back the category change | Force a failure after step 5 inside a transaction; assert `clients.client_category_id` unchanged |
| One form save = one RPC call | Load the client form in the browser, save, and count `update_client_classification` requests in the network log |
| News Categories unchanged | Assert `public.categories` row count and names still match the 18 known values |

Results of each check are reported back before anything is considered done.

## Technical notes

- No table schema changes; only the function is replaced.
- `FOR UPDATE` on the client row serialises concurrent saves for the same client, so two
  admins editing at once can no longer interleave a category update with the other's
  assignment insert.
- Failure rollback relies on Postgres statement-level atomicity: a `RAISE EXCEPTION`
  anywhere in the function undoes the delete, update and insert together.
