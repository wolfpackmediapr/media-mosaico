
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The storage bucket name
 * @param folder - Optional folder path within the bucket
 * @returns Object containing path and url of the uploaded file
 */
export const uploadFileToStorage = async (
  file: File,
  bucket: string = 'audio',
  folder: string = ''
): Promise<{
  path: string;
  url: string;
  error?: string;
}> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading file:', error);
      return { path: '', url: '', error: error.message };
    }
    
    // Generate a public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data?.path || filePath);
    
    return {
      path: data?.path || filePath,
      url: publicUrl
    };
  } catch (err) {
    console.error('Unexpected error during file upload:', err);
    return { 
      path: '', 
      url: '', 
      error: err instanceof Error ? err.message : 'Unknown error during upload' 
    };
  }
};

/**
 * Store audio file metadata in the database
 */
export const saveAudioFileMetadata = async (
  file: File,
  storagePath: string,
  duration?: number,
  transcriptionId?: string
) => {
  try {
    // Using a raw SQL query instead of the Supabase client's .from() method
    // because the TypeScript types are not yet updated to include the new table
    const { data, error } = await supabase.rpc('insert_audio_file', {
      p_filename: file.name,
      p_storage_path: storagePath,
      p_file_size: file.size,
      p_mime_type: file.type,
      p_duration: duration,
      p_transcription_id: transcriptionId
    });
    
    if (error) {
      console.error('Error saving audio file metadata:', error);
      return { error };
    }
    
    return { data };
  } catch (err) {
    console.error('Unexpected error storing audio file metadata:', err);
    return { 
      error: err instanceof Error ? err.message : 'Unknown error storing metadata'
    };
  }
};

/**
 * Delete a file from Supabase Storage
 */
export const deleteFileFromStorage = async (
  path: string,
  bucket: string = 'audio'
) => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) {
      console.error('Error deleting file:', error);
      return { error };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Unexpected error during file deletion:', err);
    return { 
      error: err instanceof Error ? err.message : 'Unknown error during deletion' 
    };
  }
};

/**
 * Get a list of audio files for the current user
 */
export const getUserAudioFiles = async () => {
  try {
    // Using a raw SQL query instead of the Supabase client's .from() method
    const { data, error } = await supabase.rpc('get_user_audio_files');
    
    if (error) {
      console.error('Error fetching user audio files:', error);
      return { error };
    }
    
    return { data };
  } catch (err) {
    console.error('Unexpected error fetching audio files:', err);
    return { 
      error: err instanceof Error ? err.message : 'Unknown error fetching files'
    };
  }
};

/**
 * Get a signed URL for a file in storage
 * This is useful for files that aren't publicly accessible
 */
export const getSignedUrl = async (
  path: string,
  bucket: string = 'audio',
  expiresIn: number = 3600
) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      return { error };
    }
    
    return { url: data.signedUrl };
  } catch (err) {
    console.error('Unexpected error creating signed URL:', err);
    return { 
      error: err instanceof Error ? err.message : 'Unknown error creating URL'
    };
  }
};
