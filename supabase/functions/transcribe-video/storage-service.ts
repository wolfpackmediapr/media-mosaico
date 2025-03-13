
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

/**
 * Validate file exists in storage
 */
export const validateFileExists = async (supabase: any, videoPath: string): Promise<boolean> => {
  const { data: fileExists, error: fileCheckError } = await supabase
    .storage
    .from('media')
    .list(videoPath.split('/')[0], {
      limit: 1,
      offset: 0,
      search: videoPath.split('/')[1]
    });

  if (fileCheckError) {
    console.error('Error checking file existence:', fileCheckError);
    throw new Error(`Failed to check file existence: ${fileCheckError.message}`);
  }

  if (!fileExists || fileExists.length === 0) {
    console.error('File not found in storage:', videoPath);
    throw new Error('File not found in storage');
  }

  return true;
};

/**
 * Generate signed URL for file access
 */
export const generateSignedUrl = async (supabase: any, videoPath: string): Promise<string> => {
  console.log('Generating signed URL for', videoPath);

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('media')
    .createSignedUrl(videoPath, 60);

  if (signedUrlError) {
    console.error('Signed URL error:', signedUrlError);
    throw new Error(`Failed to generate signed URL: ${signedUrlError.message}`);
  }

  if (!signedUrlData?.signedUrl) {
    throw new Error('No signed URL generated');
  }

  console.log('Signed URL generated successfully');
  return signedUrlData.signedUrl;
};

/**
 * Download file from URL
 */
export const downloadFile = async (url: string): Promise<Blob> => {
  console.log('Downloading file from signed URL');
  const fileResponse = await fetch(url);
  
  if (!fileResponse.ok) {
    console.error('File download failed:', fileResponse.status, fileResponse.statusText);
    throw new Error(`Failed to download file: ${fileResponse.statusText}`);
  }

  const fileData = await fileResponse.blob();
  console.log('File downloaded successfully, size:', fileData.size);
  return fileData;
};

/**
 * Update transcription record in database
 * Returns the transcription ID
 */
export const updateTranscriptionRecord = async (
  supabase: any, 
  videoPath: string, 
  transcriptResult: any,
  transcriptionText: string
): Promise<string | null> => {
  if (!transcriptResult) return null;

  // First, query to get the transcription ID
  const { data: transcription, error: queryError } = await supabase
    .from('transcriptions')
    .select('id')
    .eq('original_file_path', videoPath)
    .single();
    
  if (queryError) {
    console.error('Error querying transcription record:', queryError);
    return null;
  }
  
  const transcriptionId = transcription?.id;
  
  // Now update the record
  const { error: updateError } = await supabase
    .from('transcriptions')
    .update({ 
      transcription_text: transcriptionText,
      assembly_chapters: transcriptResult.chapters || null,
      assembly_entities: transcriptResult.entities || null,
      assembly_key_phrases: transcriptResult.auto_highlights_result || null,
      assembly_summary: transcriptResult.summary || null,
      status: 'completed',
      progress: 100
    })
    .eq('id', transcriptionId);

  if (updateError) {
    console.error('Error updating transcription record:', updateError);
    return null;
  }
  
  return transcriptionId;
};

/**
 * Create Supabase client
 */
export const createSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};
