-- Fix RLS policies for user_profiles table
-- Add missing INSERT policy to allow users to create their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Add missing UPDATE policy to allow users to update their own profile  
CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure tv_transcriptions has proper INSERT policy
DROP POLICY IF EXISTS "Users can insert their own tv transcriptions" ON public.tv_transcriptions;
CREATE POLICY "Users can insert their own tv transcriptions" 
ON public.tv_transcriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);