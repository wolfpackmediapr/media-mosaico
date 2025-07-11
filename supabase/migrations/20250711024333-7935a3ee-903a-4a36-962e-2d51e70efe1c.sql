-- Phase 1: Database Schema Enhancement

-- Create video_chunk_manifests table to track chunk-based files
CREATE TABLE public.video_chunk_manifests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.chunked_upload_sessions(session_id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  total_size BIGINT NOT NULL,
  total_chunks INTEGER NOT NULL,
  chunk_order JSONB NOT NULL, -- Array of chunk info with order, size, storage_path
  mime_type TEXT,
  duration REAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add new fields to chunked_upload_sessions for chunk-based strategy
ALTER TABLE public.chunked_upload_sessions 
ADD COLUMN manifest_created BOOLEAN DEFAULT false,
ADD COLUMN playback_type TEXT DEFAULT 'assembled' CHECK (playback_type IN ('assembled', 'chunked'));

-- Enable RLS on video_chunk_manifests
ALTER TABLE public.video_chunk_manifests ENABLE ROW LEVEL SECURITY;

-- Create policies for video_chunk_manifests
CREATE POLICY "Users can manage their own chunk manifests" 
ON public.video_chunk_manifests 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_video_chunk_manifests_session_id ON public.video_chunk_manifests(session_id);
CREATE INDEX idx_video_chunk_manifests_user_id ON public.video_chunk_manifests(user_id);
CREATE INDEX idx_chunked_upload_sessions_manifest_created ON public.chunked_upload_sessions(manifest_created);

-- Create trigger for updated_at
CREATE TRIGGER update_video_chunk_manifests_updated_at
BEFORE UPDATE ON public.video_chunk_manifests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();