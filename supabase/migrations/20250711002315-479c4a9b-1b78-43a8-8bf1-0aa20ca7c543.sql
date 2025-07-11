-- Create a separate storage bucket for video uploads with chunked upload support
INSERT INTO storage.buckets (id, name, public)
VALUES ('video', 'video', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for the video bucket to allow authenticated users to upload and manage files
CREATE POLICY "Authenticated users can upload video files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'video' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view video files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'video' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update video files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'video' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete video files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'video' AND auth.role() = 'authenticated');

-- Create a table to track chunked upload sessions (optional, for advanced session management)
CREATE TABLE IF NOT EXISTS public.chunked_upload_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  total_chunks INTEGER NOT NULL,
  uploaded_chunks INTEGER DEFAULT 0,
  file_size BIGINT NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on chunked upload sessions
ALTER TABLE public.chunked_upload_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for chunked upload sessions
CREATE POLICY "Users can manage their own upload sessions" 
ON public.chunked_upload_sessions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_chunked_upload_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chunked_upload_sessions_updated_at
  BEFORE UPDATE ON public.chunked_upload_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chunked_upload_sessions_updated_at();