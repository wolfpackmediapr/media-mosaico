ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients(is_active);