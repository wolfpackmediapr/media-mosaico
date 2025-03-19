
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

/**
 * Validate file exists in storage
 */
export const validateFileExists = async (supabase: any, videoPath: string): Promise<boolean> => {
  console.log('Checking if file exists:', videoPath);
  
  try {
    // Split into bucket path and file path
    const pathParts = videoPath.split('/');
    const bucket = pathParts[0];
    const filePath = pathParts.slice(1).join('/');
    
    console.log(`Looking for file in bucket "${bucket}" with path "${filePath}"`);
    
    const { data: fileExists, error: fileCheckError } = await supabase
      .storage
      .from('media')
      .list(bucket, {
        limit: 100,
        offset: 0,
        search: filePath
      });

    if (fileCheckError) {
      console.error('Error checking file existence:', fileCheckError);
      throw new Error(`Failed to check file existence: ${fileCheckError.message}`);
    }

    if (!fileExists || fileExists.length === 0) {
      console.error('File not found in storage:', videoPath);
      
      // Attempt additional debugging - list all files in the media bucket
      const { data: allFiles } = await supabase.storage.from('media').list(bucket, { limit: 100 });
      console.log('Available files in media bucket:', allFiles);
      
      throw new Error('File not found in storage. Please check file path and retry upload.');
    }

    console.log('File exists in storage');
    return true;
  } catch (error) {
    console.error('Error in validateFileExists:', error);
    throw error;
  }
};

/**
 * Generate signed URL for file access
 */
export const generateSignedUrl = async (supabase: any, videoPath: string): Promise<string> => {
  console.log('Generating signed URL for', videoPath);

  try {
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
  } catch (error) {
    console.error('Error in generateSignedUrl:', error);
    throw error;
  }
};

/**
 * Download file from URL
 */
export const downloadFile = async (url: string): Promise<Blob> => {
  console.log('Downloading file from signed URL');
  
  try {
    const fileResponse = await fetch(url);
    
    if (!fileResponse.ok) {
      console.error('File download failed:', fileResponse.status, fileResponse.statusText);
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }

    const fileData = await fileResponse.blob();
    console.log('File downloaded successfully, size:', fileData.size, 'bytes, type:', fileData.type);
    
    if (fileData.size === 0) {
      throw new Error('Downloaded file is empty (0 bytes)');
    }
    
    return fileData;
  } catch (error) {
    console.error('Error in downloadFile:', error);
    throw error;
  }
};

/**
 * Update transcription record in database
 */
export const updateTranscriptionRecord = async (
  supabase: any, 
  videoPath: string, 
  transcriptResult: any,
  transcriptionText: string
): Promise<void> => {
  try {
    if (!transcriptResult) return;

    console.log('Updating transcription record for:', videoPath);

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
      .eq('original_file_path', videoPath);

    if (updateError) {
      console.error('Error updating transcription record:', updateError);
      throw new Error(`Failed to update transcription record: ${updateError.message}`);
    }
    
    console.log('Transcription record updated successfully');
  } catch (error) {
    console.error('Error in updateTranscriptionRecord:', error);
    throw error;
  }
};

/**
 * Create Supabase client
 */
export const createSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase environment variables not configured');
    throw new Error('Supabase configuration missing');
  }
  
  console.log('Creating Supabase client with URL:', supabaseUrl);
  
  return createClient(supabaseUrl, supabaseServiceKey);
};
