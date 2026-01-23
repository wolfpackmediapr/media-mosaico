-- Add policy to allow authenticated users to read all transcriptions for dashboard stats
CREATE POLICY "Allow authenticated users to read all transcriptions for stats" 
ON public.transcriptions 
FOR SELECT 
TO authenticated
USING (true);

-- Add policy to allow authenticated users to read all TV transcriptions for dashboard stats
CREATE POLICY "Allow authenticated users to read all TV transcriptions for stats" 
ON public.tv_transcriptions 
FOR SELECT 
TO authenticated
USING (true);

-- Add policy to allow authenticated users to read all press clippings for dashboard stats
CREATE POLICY "Allow authenticated users to read all press clippings for stats" 
ON public.press_clippings 
FOR SELECT 
TO authenticated
USING (true);

-- Drop the old restrictive SELECT policies (keep INSERT/UPDATE/DELETE restrictive)
DROP POLICY IF EXISTS "Users can view their own transcriptions" ON public.transcriptions;
DROP POLICY IF EXISTS "Users can view their own tv transcriptions" ON public.tv_transcriptions;
DROP POLICY IF EXISTS "Users can view their own TV transcriptions" ON public.tv_transcriptions;
DROP POLICY IF EXISTS "Users can view own press clippings" ON public.press_clippings;