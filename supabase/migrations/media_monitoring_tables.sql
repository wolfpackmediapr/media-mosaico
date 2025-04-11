
-- Create monitoring_targets table
CREATE TABLE IF NOT EXISTS public.monitoring_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('client', 'topic', 'brand')),
  keywords TEXT[] NOT NULL,
  categories TEXT[],
  importance INTEGER DEFAULT 3,
  client_id UUID REFERENCES public.clients(id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create target_mentions table
CREATE TABLE IF NOT EXISTS public.target_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_id UUID NOT NULL REFERENCES public.monitoring_targets(id),
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('news', 'social', 'radio', 'tv', 'press')),
  matched_keywords TEXT[],
  importance INTEGER DEFAULT 3,
  analysis_result JSONB,
  read BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add last_monitored column to existing tables if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'news_articles' 
                AND column_name = 'last_monitored') THEN
    ALTER TABLE public.news_articles ADD COLUMN last_monitored TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'transcriptions' 
                AND column_name = 'last_monitored') THEN
    ALTER TABLE public.transcriptions ADD COLUMN last_monitored TIMESTAMPTZ;
  END IF;
END $$;

-- Add RLS policies
ALTER TABLE public.monitoring_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_mentions ENABLE ROW LEVEL SECURITY;

-- Default policy for authenticated users
CREATE POLICY "Authenticated users can read monitoring_targets"
  ON public.monitoring_targets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert monitoring_targets"
  ON public.monitoring_targets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update monitoring_targets"
  ON public.monitoring_targets
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policies for target_mentions
CREATE POLICY "Authenticated users can read target_mentions"
  ON public.target_mentions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert target_mentions"
  ON public.target_mentions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update target_mentions"
  ON public.target_mentions
  FOR UPDATE
  TO authenticated
  USING (true);

-- Add monitoring scheduling
CREATE TABLE IF NOT EXISTS public.monitoring_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('hourly', 'daily', 'weekly')),
  target_ids UUID[],
  content_types TEXT[],
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.monitoring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage monitoring_schedules"
  ON public.monitoring_schedules
  FOR ALL
  TO authenticated
  USING (true);
