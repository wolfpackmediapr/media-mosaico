
-- Fix foreign key constraints to use ON DELETE CASCADE for user deletion

-- radio_transcriptions
ALTER TABLE public.radio_transcriptions DROP CONSTRAINT radio_transcriptions_user_id_fkey;
ALTER TABLE public.radio_transcriptions ADD CONSTRAINT radio_transcriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- audio_files
ALTER TABLE public.audio_files DROP CONSTRAINT audio_files_user_id_fkey;
ALTER TABLE public.audio_files ADD CONSTRAINT audio_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- conversion_jobs
ALTER TABLE public.conversion_jobs DROP CONSTRAINT conversion_jobs_user_id_fkey;
ALTER TABLE public.conversion_jobs ADD CONSTRAINT conversion_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- media_posts
ALTER TABLE public.media_posts DROP CONSTRAINT media_posts_user_id_fkey;
ALTER TABLE public.media_posts ADD CONSTRAINT media_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- news_articles
ALTER TABLE public.news_articles DROP CONSTRAINT news_articles_user_id_fkey;
ALTER TABLE public.news_articles ADD CONSTRAINT news_articles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- pdf_processing_jobs
ALTER TABLE public.pdf_processing_jobs DROP CONSTRAINT pdf_processing_jobs_user_id_fkey;
ALTER TABLE public.pdf_processing_jobs ADD CONSTRAINT pdf_processing_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- press_clippings
ALTER TABLE public.press_clippings DROP CONSTRAINT press_clippings_user_id_fkey;
ALTER TABLE public.press_clippings ADD CONSTRAINT press_clippings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- reports
ALTER TABLE public.reports DROP CONSTRAINT reports_user_id_fkey;
ALTER TABLE public.reports ADD CONSTRAINT reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- transcriptions
ALTER TABLE public.transcriptions DROP CONSTRAINT transcriptions_user_id_fkey;
ALTER TABLE public.transcriptions ADD CONSTRAINT transcriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- tv_transcriptions
ALTER TABLE public.tv_transcriptions DROP CONSTRAINT tv_transcriptions_user_id_fkey;
ALTER TABLE public.tv_transcriptions ADD CONSTRAINT tv_transcriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- tv_migrations
ALTER TABLE public.tv_migrations DROP CONSTRAINT tv_migrations_applied_by_fkey;
ALTER TABLE public.tv_migrations ADD CONSTRAINT tv_migrations_applied_by_fkey FOREIGN KEY (applied_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- videos
ALTER TABLE public.videos DROP CONSTRAINT videos_user_id_fkey;
ALTER TABLE public.videos ADD CONSTRAINT videos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
