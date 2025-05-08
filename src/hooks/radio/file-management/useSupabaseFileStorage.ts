
import { useCallback, useState } from "react";
import { uploadAudioToSupabase } from "@/utils/supabase-storage-helper";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { UploadedFile } from "@/components/radio/types";
import { toast } from "sonner";

interface UseSupabaseFileStorageProps {
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
}

interface UseSupabaseFileStorageReturn {
  isUploading: Record<string, boolean>;
  uploadFileToStorage: (file: UploadedFile) => Promise<boolean>;
  syncFilesToSupabase: () => void;
}

/**
 * Hook for integrating with Supabase storage for file uploads
 */
export const useSupabaseFileStorage = ({ 
  files, 
  setFiles 
}: UseSupabaseFileStorageProps): UseSupabaseFileStorageReturn => {
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const { isAuthenticated } = useAuthStatus();

  // Upload a file to Supabase storage
  const uploadFileToStorage = useCallback(async (file: UploadedFile): Promise<boolean> => {
    if (!isAuthenticated) return false;
    
    // Skip if the file already has a storage URL
    if (file.storagePath && file.storageUrl) return true;
    
    // Skip if it's already uploading
    if (isUploading[file.name]) return false;
    
    try {
      setIsUploading(prev => ({ ...prev, [file.name]: true }));
      console.log('[useSupabaseFileStorage] Uploading file to storage:', file.name);
      
      const result = await uploadAudioToSupabase(file);
      if (result.error) {
        console.error('[useSupabaseFileStorage] Upload error:', result.error);
        toast.error(`Error uploading file: ${result.error}`);
        return false;
      }
      
      // Update the file object with storage info
      file.storagePath = result.path;
      file.storageUrl = result.url;
      
      // Update the metadata with the storage info
      setFiles(prev => prev.map(f => {
        if (f.name === file.name) {
          return {
            ...f,
            storagePath: result.path,
            storageUrl: result.url
          };
        }
        return f;
      }));
      
      console.log('[useSupabaseFileStorage] File uploaded successfully:', result.path);
      return true;
    } catch (error) {
      console.error('[useSupabaseFileStorage] Error uploading file:', error);
      return false;
    } finally {
      setIsUploading(prev => ({ ...prev, [file.name]: false }));
    }
  }, [isAuthenticated, setFiles, isUploading]);

  // Synchronize all files with Supabase storage
  const syncFilesToSupabase = useCallback(() => {
    if (!isAuthenticated) return;
    
    files.forEach(file => {
      // Skip already uploaded files
      if (file.storagePath && file.storageUrl) return;
      
      uploadFileToStorage(file);
    });
  }, [files, isAuthenticated, uploadFileToStorage]);

  return {
    isUploading,
    uploadFileToStorage,
    syncFilesToSupabase
  };
};
