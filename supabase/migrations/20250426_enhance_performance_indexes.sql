
-- Add additional indexes to improve performance on frequently queried columns

-- Enhance existing indexes on news_articles table
CREATE INDEX IF NOT EXISTS idx_news_articles_client_id ON public.news_articles(client_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_content_trgm ON public.news_articles USING GIN (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_news_articles_search ON public.news_articles USING GIN (to_tsvector('spanish', title || ' ' || description || ' ' || content));

-- Enhance existing indexes on radio_transcriptions table
CREATE INDEX IF NOT EXISTS idx_radio_transcriptions_station_id ON public.radio_transcriptions(station_id);
CREATE INDEX IF NOT EXISTS idx_radio_transcriptions_program_id ON public.radio_transcriptions(program_id);
CREATE INDEX IF NOT EXISTS idx_radio_transcriptions_text_search ON public.radio_transcriptions USING GIN (to_tsvector('spanish', transcription_text));

-- Add indexes for client_notifications for better sorting and filtering
CREATE INDEX IF NOT EXISTS idx_client_notifications_created_at ON public.client_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_client_notifications_importance ON public.client_notifications(importance_level);
CREATE INDEX IF NOT EXISTS idx_client_notifications_content_type ON public.client_notifications(content_type);

-- Add indexes for faster joins on common lookup tables
CREATE INDEX IF NOT EXISTS idx_radio_programs_station_id ON public.radio_programs(station_id);
CREATE INDEX IF NOT EXISTS idx_tv_programs_channel_id ON public.tv_programs(channel_id);

-- Add indexes for media tables
CREATE INDEX IF NOT EXISTS idx_media_outlets_type ON public.media_outlets(type);
CREATE INDEX IF NOT EXISTS idx_media_outlets_name_trgm ON public.media_outlets USING GIN (name gin_trgm_ops);

-- Ensure the extension is enabled for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
