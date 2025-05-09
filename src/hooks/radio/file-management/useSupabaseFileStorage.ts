
import { useCallback, useState, useEffect } from "react";
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
  uploadProgress: Record<string, number>;
  uploadFileToStorage: (file: UploadedFile) => Promise<boolean>;
  syncFilesToSupabase: () => void;
  cancelUpload: (fileName: string) => void;
}

/**
 * Hook for integrating with Supabase storage for file uploads
 */
export const useSupabaseFileStorage = ({ 
  files, 
  setFiles 
}: UseSupabaseFileStorageProps): UseSupabaseFileStorageReturn => {
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadRetries, setUploadRetries] = useState<Record<string, number>>({});
  const [uploadCancelled, setUploadCancelled] = useState<Record<string, boolean>>({});
  
  const { isAuthenticated } = useAuthStatus();

  // Reset cancelled status for new files
  useEffect(() => {
    const fileNames = files.filter(f => f?.name).map(f => f.name);
    setUploadCancelled(prev => {
      const newState = { ...prev };
      // Only keep entries for current files
      Object.keys(newState).forEach(key => {
        if (!fileNames.includes(key)) {
          delete newState[key];
        }
      });
      return newState;
    });
  }, [files]);

  // Cancel an ongoing upload
  const cancelUpload = useCallback((fileName: string) => {
    if (isUploading[fileName]) {
      setUploadCancelled(prev => ({ ...prev, [fileName]: true }));
      
      // Update UI to reflect cancelled state
      setIsUploading(prev => ({ ...prev, [fileName]: false }));
      setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
      
      console.log('[useSupabaseFileStorage] Upload cancelled for:', fileName);
    }
  }, [isUploading]);

  // Upload a file to Supabase storage with progress simulation
  const uploadFileToStorage = useCallback(async (file: UploadedFile): Promise<boolean> => {
    // Add safety check - if not authenticated, don't try to upload
    if (!isAuthenticated) {
      console.log('[useSupabaseFileStorage] User not authenticated, skipping upload');
      return false;
    }
    
    // Add safety check - validate file object
    if (!file || typeof file !== 'object') {
      console.error('[useSupabaseFileStorage] Invalid file object provided for upload');
      return false;
    }
    
    // Add safety check - ensure file has a name
    if (!file.name) {
      console.error('[useSupabaseFileStorage] File missing name property');
      return false;
    }
    
    const fileName = file.name;
    
    // Skip if the file already has a storage URL
    if (file.storagePath && file.storageUrl) return true;
    
    // Skip if it's already uploading
    if (isUploading[fileName]) return false;
    
    // Skip if upload was cancelled
    if (uploadCancelled[fileName]) {
      console.log('[useSupabaseFileStorage] Upload previously cancelled for:', fileName);
      return false;
    }
    
    // Reset cancelled flag if it exists
    if (uploadCancelled[fileName]) {
      setUploadCancelled(prev => ({ ...prev, [fileName]: false }));
    }
    
    // Set maximum retries
    const MAX_RETRIES = 2;
    const currentRetries = uploadRetries[fileName] || 0;
    
    try {
      setIsUploading(prev => ({ ...prev, [fileName]: true }));
      setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
      
      console.log('[useSupabaseFileStorage] Uploading file to storage:', fileName);
      
      // Simulate progress updates
      const progressUpdater = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[fileName] || 0;
          if (currentProgress >= 90 || uploadCancelled[fileName]) {
            clearInterval(progressUpdater);
            return prev;
          }
          // Randomized progress simulation for more realistic UX
          return { ...prev, [fileName]: Math.min(90, currentProgress + Math.random() * 15) };
        });
      }, 800);
      
      // Ensure file is a valid File object before uploading
      if (!(file instanceof File)) {
        if (!file.size || !file.type) {
          throw new Error('Invalid file object: missing required properties');
        }
      }
      
      const result = await uploadAudioToSupabase(file as File);
      
      // Clear the progress updater if still running
      clearInterval(progressUpdater);
      
      // Check if upload was cancelled during the process
      if (uploadCancelled[fileName]) {
        console.log('[useSupabaseFileStorage] Upload was cancelled during processing');
        setIsUploading(prev => ({ ...prev, [fileName]: false }));
        return false;
      }
      
      if (result.error) {
        console.error('[useSupabaseFileStorage] Upload error:', result.error);
        
        // Handle retriable errors with limited retries
        if (currentRetries < MAX_RETRIES && !result.error.includes('permission denied')) {
          setUploadRetries(prev => ({ ...prev, [fileName]: currentRetries + 1 }));
          toast.error(`Error al subir el archivo. Reintentando... (${currentRetries + 1}/${MAX_RETRIES + 1})`, {
            duration: 3000,
            id: `upload-retry-${fileName}`
          });
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1500));
          return uploadFileToStorage(file);
        }
        
        // Handle permission errors specifically
        if (result.error.includes('permission denied')) {
          toast.error(`Error de permisos al subir el archivo. Por favor, inicie sesión nuevamente.`, {
            duration: 5000,
            id: `upload-error-${fileName}`
          });
        } else {
          toast.error(`Error al subir el archivo: ${result.error}`, { 
            duration: 5000,
            id: `upload-error-${fileName}`
          });
        }
        
        setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
        return false;
      }
      
      // Update progress to 100% when complete
      setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
      
      // Update the file object with storage info
      file.storagePath = result.path;
      file.storageUrl = result.url;
      
      // Update the metadata with the storage info
      setFiles(prev => prev.map(f => {
        if (f && f.name === fileName) {
          return {
            ...f,
            storagePath: result.path,
            storageUrl: result.url
          };
        }
        return f;
      }));
      
      console.log('[useSupabaseFileStorage] File uploaded successfully:', result.path);
      
      // Give UI time to show 100% before clearing status
      setTimeout(() => {
        setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('[useSupabaseFileStorage] Error uploading file:', error);
      setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
      
      toast.error('Error inesperado al subir el archivo. Intente nuevamente.', {
        duration: 5000,
        id: `upload-error-${fileName}`
      });
      
      return false;
    } finally {
      setIsUploading(prev => ({ ...prev, [fileName]: false }));
    }
  }, [isAuthenticated, setFiles, isUploading, uploadCancelled, uploadRetries]);

  // Synchronize all files with Supabase storage with better error handling
  const syncFilesToSupabase = useCallback(() => {
    // Add safety check - if not authenticated, don't try to upload
    if (!isAuthenticated) {
      console.log('[useSupabaseFileStorage] User not authenticated, skipping sync');
      return;
    }
    
    // Add safety check - validate files array
    if (!Array.isArray(files) || files.length === 0) {
      console.log('[useSupabaseFileStorage] No files to sync');
      return;
    }
    
    // Process files in sequence rather than all at once to prevent overwhelming the network
    const processNextFile = async (index = 0) => {
      if (index >= files.length) return;
      
      const file = files[index];
      
      // Skip invalid files
      if (!file || typeof file !== 'object' || !file.name) {
        console.log('[useSupabaseFileStorage] Skipping invalid file at index', index);
        processNextFile(index + 1);
        return;
      }
      
      // Skip already uploaded files
      if (file.storagePath && file.storageUrl) {
        processNextFile(index + 1);
        return;
      }
      
      try {
        await uploadFileToStorage(file);
      } catch (e) {
        console.error(`[useSupabaseFileStorage] Error syncing file ${file.name}:`, e);
      }
      
      // Add a small delay between files
      setTimeout(() => processNextFile(index + 1), 500);
    };
    
    processNextFile();
  }, [files, isAuthenticated, uploadFileToStorage]);

  return {
    isUploading,
    uploadProgress,
    uploadFileToStorage,
    syncFilesToSupabase,
    cancelUpload
  };
};
