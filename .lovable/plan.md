

## Fix: User Deletion Blocked by Foreign Key Constraints

### Problem

When an administrator tries to delete a user, the operation fails because multiple tables have foreign key constraints referencing `auth.users` **without** `ON DELETE CASCADE`. The error you see (`radio_transcriptions_user_id_fkey`) is just the first one encountered -- there are actually 11 tables with this issue.

### Solution

Run a single database migration that drops and re-creates all the missing `ON DELETE CASCADE` foreign key constraints. This ensures that when a user is deleted, all their related data (transcriptions, files, jobs, etc.) is automatically cleaned up.

### Tables That Need Fixing

| Table | Constraint | Current Rule |
|-------|-----------|-------------|
| radio_transcriptions | radio_transcriptions_user_id_fkey | NO ACTION |
| audio_files | audio_files_user_id_fkey | NO ACTION |
| conversion_jobs | conversion_jobs_user_id_fkey | NO ACTION |
| media_posts | media_posts_user_id_fkey | NO ACTION |
| news_articles | news_articles_user_id_fkey | NO ACTION |
| pdf_processing_jobs | pdf_processing_jobs_user_id_fkey | NO ACTION |
| press_clippings | press_clippings_user_id_fkey | NO ACTION |
| reports | reports_user_id_fkey | NO ACTION |
| transcriptions | transcriptions_user_id_fkey | NO ACTION |
| tv_transcriptions | tv_transcriptions_user_id_fkey | NO ACTION |
| tv_migrations | tv_migrations_applied_by_fkey | NO ACTION |
| videos | videos_user_id_fkey | NO ACTION |

Tables already correctly configured (no changes needed): `profiles`, `user_profiles`, `user_roles`, `speaker_labels`, `video_chunk_manifests`, and all `auth.*` tables.

### What Will Change

- A single SQL migration will drop each constraint above and re-add it with `ON DELETE CASCADE`
- No code changes needed -- the `delete_user` function already works correctly
- No UI changes

### What This Means

When an admin deletes a user, all of that user's radio transcriptions, audio files, press clippings, TV transcriptions, videos, reports, and other user-owned data will be automatically removed from the database. This is the standard and safest approach at the database level.

