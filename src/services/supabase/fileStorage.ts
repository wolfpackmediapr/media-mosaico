
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { UploadedFile } from "@/components/radio/types";

/**
 * Uploads a file to Supabase storage in the audio bucket
 * @param file File to upload
 * @returns Object containing the path and public URL of the uploaded file
 */
export const uploadFileToStorage = async (file: File) => {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `${userId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('audio')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(filePath);

    console.log(`[fileStorage] File uploaded successfully. Remote URL: ${publicUrl}`);

    return {
      path: filePath,
      url: publicUrl,
      error: null
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    return {
      path: null,
      url: null,
      error
    };
  }
};

/**
 * Saves metadata for an uploaded audio file to the database
 * @param file The file that was uploaded
 * @param storagePath The path where the file is stored in Supabase storage
 * @returns The saved file metadata
 */
export const saveAudioFileMetadata = async (file: File, storagePath: string) => {
  try {
    const { data, error } = await supabase.rpc('insert_audio_file', {
      p_filename: file.name,
      p_storage_path: storagePath,
      p_file_size: file.size,
      p_mime_type: file.type
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error saving audio file metadata:", error);
    toast.error("Error saving file information");
    return null;
  }
};

/**
 * Deletes a file from Supabase storage
 * @param storagePath The path of the file in storage
 * @returns Success or error status
 */
export const deleteFileFromStorage = async (storagePath: string) => {
  try {
    const { error } = await supabase.storage
      .from('audio')
      .remove([storagePath]);

    if (error) {
      throw error;
    }

    // Also delete the metadata from the database
    await supabase
      .from('audio_files')
      .delete()
      .eq('storage_path', storagePath);

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting file:", error);
    return { success: false, error };
  }
};

/**
 * Fetches all audio files for the current user
 * @returns Array of audio file metadata
 */
export const getUserAudioFiles = async () => {
  try {
    // Use the RPC function we created
    const { data, error } = await supabase.rpc('get_user_audio_files');

    if (error) {
      console.error("Error fetching user audio files:", error);
      throw error;
    }

    // Log the number of files found for debugging
    console.log(`[getUserAudioFiles] Found ${data?.length || 0} audio files for user`);
    
    return { data, error: null };
  } catch (error) {
    console.error("Error in getUserAudioFiles:", error);
    return { data: null, error };
  }
};
