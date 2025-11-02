-- Allow service role to read from pdf_uploads bucket
CREATE POLICY "Service role can read pdf_uploads"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'pdf_uploads');

-- Allow authenticated users to upload to pdf_uploads
CREATE POLICY "Users can upload to pdf_uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdf_uploads');

-- Allow authenticated users to read from pdf_uploads
CREATE POLICY "Users can read from pdf_uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pdf_uploads');