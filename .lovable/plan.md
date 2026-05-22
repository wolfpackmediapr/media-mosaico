# Auto-refresh "Menciones de Clientes" on client changes

## Goal
Every place that renders `ClientSpotlightSection` (Index, Prensa, RedesSociales) should automatically refresh its matches whenever the `clients` table changes — adding, editing (name/keywords/category), deleting, or toggling active. Today the spotlight query (`["client-spotlight", ...]`) is only invalidated by React Query's `staleTime: 60_000` and a manual reload, so a newly added keyword in Configuración → Clientes doesn't show up in the feed until a minute later.

## Approach
Two complementary mechanisms — both lightweight, frontend-only, no schema changes.

### 1. Invalidate spotlight cache on client mutations
In `src/components/settings/clients/ClientsContainer.tsx`, extend the `onSuccess` of `addMutation`, `updateMutation`, `deleteMutation`, and `toggleActiveMutation` to also invalidate the spotlight queries:

```ts
queryClient.invalidateQueries({ queryKey: ["client-spotlight"] });
```

This guarantees an instant refresh when the admin edits clients in the same session/tab.

### 2. Realtime subscription to `clients` table
Create `src/hooks/use-clients-realtime.ts` that subscribes to all `postgres_changes` events (`INSERT`, `UPDATE`, `DELETE`) on `public.clients` and, on any event, invalidates:
- `["client-spotlight"]`
- `["clients"]` (so the settings list also stays in sync across tabs/users)

Pattern mirrors existing `src/hooks/use-dashboard-realtime.ts`.

Mount this hook inside `ClientSpotlightSection.tsx` so any page using the spotlight automatically gets live updates without each page having to wire it up.

## Technical details
- Spotlight query key prefix is `"client-spotlight"` (see `use-client-spotlight.ts`); `invalidateQueries({ queryKey: ["client-spotlight"] })` invalidates all scopes (`all`/`news`/`social`) and day variants in one call.
- The realtime channel must have a unique name (e.g. `clients-realtime`) and be cleaned up on unmount via `supabase.removeChannel`.
- No changes to `clientMatcher.ts`, `useClientSpotlight`, `clientService`, AI edge functions, or the DB — input contract is unchanged.
- Requires `clients` table to be in the `supabase_realtime` publication. If realtime events don't fire after deploy, add it via migration:
  ```sql
  alter publication supabase_realtime add table public.clients;
  alter table public.clients replica identity full;
  ```
  (Will verify after deploy; only run if needed.)

## Files
- edit `src/components/settings/clients/ClientsContainer.tsx` — invalidate `client-spotlight` in 4 mutation `onSuccess` handlers
- create `src/hooks/use-clients-realtime.ts` — realtime subscription invalidating `client-spotlight` and `clients`
- edit `src/components/social/ClientSpotlightSection.tsx` — call `useClientsRealtime()`
