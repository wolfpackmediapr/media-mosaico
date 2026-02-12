
-- Issue 1: Fix search_path on 5 trigger functions

CREATE OR REPLACE FUNCTION public.update_categories_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_chunked_upload_sessions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_speaker_labels_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_tv_news_segments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_tv_transcriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Issue 2: Fix RLS policies with USING(true) / WITH CHECK(true)

-- client_alerts
DROP POLICY IF EXISTS "Users can create alerts" ON public.client_alerts;
CREATE POLICY "Users can create alerts" ON public.client_alerts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their alerts" ON public.client_alerts;
CREATE POLICY "Users can update their alerts" ON public.client_alerts FOR UPDATE USING (auth.uid() IS NOT NULL);

-- clients
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.clients;
CREATE POLICY "Enable insert for authenticated users" ON public.clients FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.clients;
CREATE POLICY "Enable update for authenticated users" ON public.clients FOR UPDATE USING (auth.uid() IS NOT NULL);

-- company_info
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.company_info;
CREATE POLICY "Enable insert for authenticated users only" ON public.company_info FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.company_info;
CREATE POLICY "Enable update for authenticated users only" ON public.company_info FOR UPDATE USING (auth.uid() IS NOT NULL);

-- monitoring_targets
DROP POLICY IF EXISTS "Permitir acceso completo a usuarios autenticados" ON public.monitoring_targets;
CREATE POLICY "Permitir acceso completo a usuarios autenticados" ON public.monitoring_targets FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- news_articles
DROP POLICY IF EXISTS "Allow service role to insert/update news_articles" ON public.news_articles;
CREATE POLICY "Allow service role to insert/update news_articles" ON public.news_articles FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- notification_preferences
DROP POLICY IF EXISTS "Users can manage their notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can manage their notification preferences" ON public.notification_preferences FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- participant_categories
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.participant_categories;
CREATE POLICY "Enable delete access for authenticated users" ON public.participant_categories FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.participant_categories;
CREATE POLICY "Enable update access for authenticated users" ON public.participant_categories FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.participant_categories;
CREATE POLICY "Enable write access for authenticated users" ON public.participant_categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- participants
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.participants;
CREATE POLICY "Enable delete access for authenticated users" ON public.participants FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.participants;
CREATE POLICY "Enable update access for authenticated users" ON public.participants FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.participants;
CREATE POLICY "Enable write access for authenticated users" ON public.participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- services
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.services;
CREATE POLICY "Enable insert for authenticated users" ON public.services FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.services;
CREATE POLICY "Enable update for authenticated users" ON public.services FOR UPDATE USING (auth.uid() IS NOT NULL);
