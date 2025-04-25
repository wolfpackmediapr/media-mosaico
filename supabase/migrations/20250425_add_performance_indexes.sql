
-- Add indexes to frequently queried tables for better performance

-- news_articles table
CREATE INDEX IF NOT EXISTS idx_news_articles_created_at ON public.news_articles (created_at);
CREATE INDEX IF NOT EXISTS idx_news_articles_pub_date ON public.news_articles (pub_date);
CREATE INDEX IF NOT EXISTS idx_news_articles_feed_source_id ON public.news_articles (feed_source_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON public.news_articles (category);

-- transcriptions table
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON public.transcriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON public.transcriptions (created_at);
CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON public.transcriptions (status);

-- news_segments table
CREATE INDEX IF NOT EXISTS idx_news_segments_transcription_id ON public.news_segments (transcription_id);

-- client_alerts table
CREATE INDEX IF NOT EXISTS idx_client_alerts_client_id ON public.client_alerts (client_id);
CREATE INDEX IF NOT EXISTS idx_client_alerts_created_at ON public.client_alerts (created_at);
CREATE INDEX IF NOT EXISTS idx_client_alerts_status ON public.client_alerts (status);
CREATE INDEX IF NOT EXISTS idx_client_alerts_content_type ON public.client_alerts (content_type);

-- radio_transcriptions table
CREATE INDEX IF NOT EXISTS idx_radio_transcriptions_user_id ON public.radio_transcriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_radio_transcriptions_created_at ON public.radio_transcriptions (created_at);

-- processing_errors table
CREATE INDEX IF NOT EXISTS idx_processing_errors_created_at ON public.processing_errors (created_at);
CREATE INDEX IF NOT EXISTS idx_processing_errors_stage ON public.processing_errors (stage);

-- Add GIN indexes for JSON fields and arrays if they're frequently queried
CREATE INDEX IF NOT EXISTS idx_news_articles_clients_gin ON public.news_articles USING GIN (clients);
CREATE INDEX IF NOT EXISTS idx_news_articles_keywords_gin ON public.news_articles USING GIN (keywords);

-- Add index for content searching where needed
CREATE INDEX IF NOT EXISTS idx_news_articles_title_trgm ON public.news_articles USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_news_articles_description_trgm ON public.news_articles USING GIN (description gin_trgm_ops);

-- Make sure the extension is enabled for text search indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;
