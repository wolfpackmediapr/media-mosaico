
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

export interface UploadResult {
  path: string;
  url: string;
  error?: string;
}

/**
 * Uploads an audio file to Supabase storage
 * 
 * @param file The audio file to upload
 * @returns An object with the file path and public URL
 */
export async function uploadAudioToSupabase(file: File): Promise<UploadResult> {
  try {
    // Check if storage bucket exists first, create it if it doesn't
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'radio_audio');
    
    if (!bucketExists) {
      console.log('[supabase-storage-helper] Creating radio_audio bucket');
      const { error: createError } = await supabase.storage.createBucket('radio_audio', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/webm', 'audio/ogg']
      });
      
      if (createError) {
        console.error("Error creating storage bucket:", createError);
        return { 
          path: "", 
          url: "", 
          error: createError.message 
        };
      }
    }

    // Generate a unique file path to avoid collisions
    const fileExt = file.name.split('.').pop();
    const safeFileName = file.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${safeFileName.substring(0, 20)}_${uuidv4().substring(0, 8)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload the file to Supabase storage
    const { data, error } = await supabase
      .storage
      .from('radio_audio')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error("Error uploading file to Supabase:", error);
      return { 
        path: "", 
        url: "", 
        error: error.message 
      };
    }

    // Get the public URL for the file
    const { data: { publicUrl } } = supabase
      .storage
      .from('radio_audio')
      .getPublicUrl(data.path);

    return {
      path: data.path,
      url: publicUrl
    };
  } catch (err) {
    console.error("Unexpected error during file upload:", err);
    return {
      path: "",
      url: "",
      error: err instanceof Error ? err.message : "Unknown upload error"
    };
  }
}

/**
 * Deletes an audio file from Supabase storage
 * 
 * @param filePath The path of the file to delete
 * @returns Boolean indicating success
 */
export async function deleteAudioFromSupabase(filePath: string): Promise<boolean> {
  try {
    if (!filePath) return false;
    
    const { error } = await supabase
      .storage
      .from('radio_audio')
      .remove([filePath]);
    
    if (error) {
      console.error("Error deleting file from Supabase:", error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Unexpected error during file deletion:", err);
    return false;
  }
}

/**
 * Converts a Blob URL back to a File object
 * Used for converting existing Blob URLs to files that can be uploaded
 */
export async function blobUrlToFile(blobUrl: string, fileName: string, mimeType: string): Promise<File | null> {
  try {
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob URL: ${response.status}`);
    }
    
    const blob = await response.blob();
    return new File([blob], fileName, { type: mimeType });
  } catch (err) {
    console.error("Error converting Blob URL to File:", err);
    return null;
  }
}
