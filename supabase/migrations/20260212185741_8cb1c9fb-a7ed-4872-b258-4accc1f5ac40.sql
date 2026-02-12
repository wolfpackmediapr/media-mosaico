
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.services;
CREATE POLICY "Enable insert for authenticated users only" ON public.services FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.services;
CREATE POLICY "Enable update for authenticated users only" ON public.services FOR UPDATE USING (auth.uid() IS NOT NULL);
