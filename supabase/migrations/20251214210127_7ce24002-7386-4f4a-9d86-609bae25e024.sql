-- Add sentiment columns to news_articles table for AI-powered analysis
ALTER TABLE public.news_articles ADD COLUMN IF NOT EXISTS sentiment text;
ALTER TABLE public.news_articles ADD COLUMN IF NOT EXISTS sentiment_score numeric;

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_news_articles_sentiment ON public.news_articles(sentiment);
CREATE INDEX IF NOT EXISTS idx_news_articles_clients ON public.news_articles USING gin(clients);