
-- Create the video storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('video', 'video', true);

-- Create policy to allow authenticated users to upload videos
CREATE POLICY "Allow authenticated users to upload videos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'video' AND 
  auth.role() = 'authenticated'
);

-- Create policy to allow users to view videos
CREATE POLICY "Allow users to view videos" ON storage.objects
FOR SELECT USING (bucket_id = 'video');

-- Create policy to allow users to delete their own videos
CREATE POLICY "Allow users to delete their own videos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'video' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
