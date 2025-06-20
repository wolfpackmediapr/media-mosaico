-- Update the media storage bucket file size limit to 150MB
UPDATE storage.buckets 
SET file_size_limit = 157286400 
WHERE id = 'media';

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can upload files to media bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files in media bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files in media bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in media bucket" ON storage.objects;

-- Create RLS policies for the media bucket
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload files to media bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view files in the media bucket
CREATE POLICY "Users can view files in media bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'media');

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own files in media bucket" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own files in media bucket" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);