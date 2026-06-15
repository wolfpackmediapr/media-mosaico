
CREATE TABLE public.typeform_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type text NOT NULL,
  form_id text NOT NULL,
  response_id text NOT NULL,
  token text,
  submitted_at timestamptz NOT NULL,
  landed_at timestamptz,
  title text,
  summary text,
  category text,
  channel text,
  program text,
  clients text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  is_alert boolean NOT NULL DEFAULT false,
  raw_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, response_id)
);

CREATE INDEX idx_typeform_responses_form_type_submitted
  ON public.typeform_responses (form_type, submitted_at DESC);
CREATE INDEX idx_typeform_responses_submitted_at
  ON public.typeform_responses (submitted_at DESC);
CREATE INDEX idx_typeform_responses_raw_answers
  ON public.typeform_responses USING gin (raw_answers);
CREATE INDEX idx_typeform_responses_clients
  ON public.typeform_responses USING gin (clients);
CREATE INDEX idx_typeform_responses_tags
  ON public.typeform_responses USING gin (tags);

GRANT SELECT ON public.typeform_responses TO authenticated;
GRANT ALL ON public.typeform_responses TO service_role;

ALTER TABLE public.typeform_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read typeform_responses"
  ON public.typeform_responses FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_typeform_responses_updated_at
  BEFORE UPDATE ON public.typeform_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.typeform_sync_state (
  form_id text PRIMARY KEY,
  form_type text NOT NULL,
  last_synced_at timestamptz,
  last_run_at timestamptz,
  last_run_status text,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.typeform_sync_state TO authenticated;
GRANT ALL ON public.typeform_sync_state TO service_role;

ALTER TABLE public.typeform_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read typeform_sync_state"
  ON public.typeform_sync_state FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_typeform_sync_state_updated_at
  BEFORE UPDATE ON public.typeform_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
