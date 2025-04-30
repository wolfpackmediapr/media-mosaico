
-- Function to insert audio file metadata
CREATE OR REPLACE FUNCTION public.insert_audio_file(
  p_filename TEXT,
  p_storage_path TEXT,
  p_file_size BIGINT,
  p_mime_type TEXT,
  p_duration REAL DEFAULT NULL,
  p_transcription_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_id UUID;
BEGIN
  INSERT INTO audio_files (
    user_id,
    filename,
    storage_path,
    file_size,
    mime_type,
    duration,
    transcription_id
  ) VALUES (
    auth.uid(),
    p_filename,
    p_storage_path,
    p_file_size,
    p_mime_type,
    p_duration,
    p_transcription_id
  ) RETURNING id INTO v_id;
  
  SELECT row_to_json(t) INTO v_result
  FROM (
    SELECT id, filename, storage_path FROM audio_files WHERE id = v_id
  ) t;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's audio files
CREATE OR REPLACE FUNCTION public.get_user_audio_files() RETURNS SETOF audio_files AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM audio_files
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
