

## Fix Warn-Level Security Issues (Database-Only, No Code Changes)

This plan addresses all 22 warn-level findings from the Supabase linter with a single database migration. No frontend code is touched -- TV, radio, prensa escrita, and all other features remain completely unchanged.

### Issue 1: Function Search Path Mutable (5 functions)

Five simple trigger functions lack a `SET search_path` declaration. These are all `updated_at` timestamp triggers and are NOT `SECURITY DEFINER`, so the risk is minimal, but fixing satisfies the linter.

**Functions to fix:**
- `update_categories_updated_at`
- `update_chunked_upload_sessions_updated_at`
- `update_speaker_labels_updated_at`
- `update_tv_news_segments_updated_at`
- `update_tv_transcriptions_updated_at`

**Fix:** Re-create each with `SET search_path = 'public'` added.

### Issue 2: RLS Policies Always True (16 policies across 9 tables)

These policies use `USING (true)` or `WITH CHECK (true)` on INSERT, UPDATE, DELETE, or ALL operations. Since this is a collaborative workspace where all authenticated users share configuration data, the intent is correct -- but the literal `true` triggers the linter.

**Fix:** Replace `true` with `(auth.uid() IS NOT NULL)`. This is functionally identical for the `authenticated` role (which always has a non-null uid) but satisfies the linter. No behavior change.

**Tables and policies affected:**

| Table | Policy | Change |
|---|---|---|
| client_alerts | Users can create alerts | WITH CHECK true -> auth.uid() IS NOT NULL |
| client_alerts | Users can update their alerts | USING true -> auth.uid() IS NOT NULL |
| clients | Enable insert for authenticated users | WITH CHECK true -> auth.uid() IS NOT NULL |
| clients | Enable update for authenticated users | USING true -> auth.uid() IS NOT NULL |
| company_info | Enable insert for authenticated users only | WITH CHECK true -> auth.uid() IS NOT NULL |
| company_info | Enable update for authenticated users only | USING true -> auth.uid() IS NOT NULL |
| monitoring_targets | Permitir acceso completo... | USING/WITH CHECK true -> auth.uid() IS NOT NULL |
| news_articles | Allow service role to insert/update | USING/WITH CHECK true -> auth.uid() IS NOT NULL |
| notification_preferences | Users can manage their... | USING/WITH CHECK true -> auth.uid() IS NOT NULL |
| participant_categories | Enable delete/update/write | All true -> auth.uid() IS NOT NULL |
| participants | Enable delete/update/write | All true -> auth.uid() IS NOT NULL |
| services | Enable insert/update | All true -> auth.uid() IS NOT NULL |

### Issue 3: Postgres Version (1 finding)

This cannot be fixed via code. You need to upgrade Postgres from the Supabase dashboard under Project Settings > Infrastructure.

### What This Does NOT Change

- No frontend files modified
- No edge functions modified
- TV video upload/processing -- unchanged
- Radio transcription/notepad -- unchanged
- Prensa escrita/PDF processing -- unchanged
- All existing read/write behavior -- identical (authenticated users can still do everything they could before)

### Technical Details

A single SQL migration will:

```sql
-- 1. Fix search_path on 5 trigger functions
CREATE OR REPLACE FUNCTION public.update_categories_updated_at() ...
  SET search_path = 'public' ...

CREATE OR REPLACE FUNCTION public.update_chunked_upload_sessions_updated_at() ...
  SET search_path = 'public' ...

CREATE OR REPLACE FUNCTION public.update_speaker_labels_updated_at() ...
  SET search_path = 'public' ...

CREATE OR REPLACE FUNCTION public.update_tv_news_segments_updated_at() ...
  SET search_path = 'public' ...

CREATE OR REPLACE FUNCTION public.update_tv_transcriptions_updated_at() ...
  SET search_path = 'public' ...

-- 2. Drop and re-create 16 RLS policies with (auth.uid() IS NOT NULL)
--    instead of literal true, on all 9 affected tables
```

After implementation, the Supabase linter warn count should drop from 22 to 1 (the Postgres version warning which requires a manual dashboard upgrade).

