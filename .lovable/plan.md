

## Deactivate Broken RSS Feed Sources

### Problem
Two feed sources have expired RSS.app URLs returning 404 errors with 1,100+ error counts each. Working replacements ("Web" versions) are already active.

| Broken Source | Error Count | Replacement |
|---|---|---|
| El Nuevo Día (`e9652094...`) | 1,137 | El Nuevo Dia Web (`59e08c69...`) |
| Primera Hora (`7bef020c...`) | 1,135 | Primera Hora Web (`40edbf7d...`) |

### Changes

**Data operation** (using Supabase insert/update tool):

```sql
UPDATE feed_sources 
SET active = false, error_count = 0, last_fetch_error = 'Deactivated: replaced by Web source'
WHERE id IN (
  'e9652094-1504-4fa0-92ce-2054b8c4f80f',
  '7bef020c-97f9-43fe-a51b-617608b89f7d'
);
```

No code changes needed -- the feed processing edge functions already skip inactive sources (`WHERE active = true`).

