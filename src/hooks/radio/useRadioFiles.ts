
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ensureValidBlobUrl, createNewBlobUrl } from "@/utils/audio-url-validator";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { uploadAudioToSupabase } from "@/utils/supabase-storage-helper";

interface UploadedFile extends File {
  preview?: string;
  isReconstructed?: boolean;
  storagePath?: string;  // Supabase storage path
  storageUrl?: string;   // Public URL from Supabase
  id?: string;          // Make id explicitly a string type
}

interface UseRadioFilesOptions {
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
  maxFiles?: number;
}

interface UseRadioFilesReturn {
  files: UploadedFile[];
  currentFile: UploadedFile | null;
  currentFileIndex: number;
  setCurrentFileIndex: React.Dispatch<React.SetStateAction<number>>;
  addFiles: (newFiles: File[]) => void;
  removeFile: (indexToRemove: number) => void;
  isRestoringFiles: boolean;
}

export const useRadioFiles = ({
  persistKey = 'radio-files',
  storage = 'sessionStorage',
  maxFiles = 10
}: UseRadioFilesOptions): UseRadioFilesReturn => {
  // Make sure to pass persistKey as string to usePersistentState
  const [files, setFiles] = usePersistentState<UploadedFile[]>([], {
    key: persistKey, // Ensure this is a string
    storage,
    onRestore: async (restoredFiles) => {
      console.log('[useRadioFiles] Restoring files from storage', restoredFiles);
      
      if (!Array.isArray(restoredFiles)) {
        console.warn('[useRadioFiles] Restored files is not an array, resetting to empty array');
        return [];
      }

      // Enhanced file restoration with proper type handling
      try {
        const reconstructedFiles = restoredFiles.map(file => {
          // Ensure we only use string IDs
          const fileId = typeof file.id === 'string' ? file.id : 
                       (file.id ? String(file.id) : '');
          
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            preview: file.preview,
            storagePath: file.storagePath,
            storageUrl: file.storageUrl,
            id: fileId, // Now ensured to be string or empty string
            isReconstructed: true
          } as UploadedFile;
        });
        
        return reconstructedFiles;
      } catch (err) {
        console.error('[useRadioFiles] Error reconstructing files:', err);
        return [];
      }
    }
  });
  
  const [isRestoringFiles, setIsRestoringFiles] = useState(false);
  const { isAuthenticated } = useAuthStatus();
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  
  // Fix: Ensure persistKey is always a string before concatenation
  const indexKey = typeof persistKey === 'string' ? persistKey + "-current-index" : "radio-files-current-index";
  const [currentFileIndex, setCurrentFileIndex] = usePersistentState<number>(
    indexKey, // Now guaranteed to be a string
    0,
    { storage }
  );

  // Upload a file to Supabase storage
  const uploadFileToStorage = useCallback(async (file: UploadedFile): Promise<boolean> => {
    if (!isAuthenticated) return false;
    
    // Skip if the file already has a storage URL
    if (file.storagePath && file.storageUrl) return true;
    
    // Skip if it's already uploading
    if (isUploading[file.name]) return false;
    
    try {
      setIsUploading(prev => ({ ...prev, [file.name]: true }));
      console.log('[useRadioFiles] Uploading file to storage:', file.name);
      
      const result = await uploadAudioToSupabase(file);
      if (result.error) {
        console.error('[useRadioFiles] Upload error:', result.error);
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
      
      console.log('[useRadioFiles] File uploaded successfully:', result.path);
      return true;
    } catch (error) {
      console.error('[useRadioFiles] Error uploading file:', error);
      return false;
    } finally {
      setIsUploading(prev => ({ ...prev, [file.name]: false }));
    }
  }, [isAuthenticated, setFiles, isUploading]);

  // Enhanced file reconstruction - with proper storage URLs handling
  useEffect(() => {
    if (files.length === 0) return;
    
  }, [files, isAuthenticated, uploadFileToStorage]);

  // Handle adding new files
  const addFiles = useCallback((newFiles: File[]) => {
    const processedFiles = newFiles.map(file => {
      const uploadedFile = file as UploadedFile;
      
      // Create a preview URL if not already present
      if (!uploadedFile.preview) {
        uploadedFile.preview = URL.createObjectURL(file);
      }
      
      return uploadedFile;
    });
    
    setFiles(prev => [...prev, ...processedFiles]);
    
    // If authenticated, upload new files to storage
    if (isAuthenticated) {
      processedFiles.forEach(file => {
        uploadFileToStorage(file);
      });
    }
    
    // If this is the first file added, set it as current
    if (files.length === 0 && processedFiles.length > 0) {
      setCurrentFileIndex(0);
    }
  }, [files.length, setCurrentFileIndex, isAuthenticated, uploadFileToStorage, setFiles]);

  // Remove a file
  const removeFile = useCallback((indexToRemove: number) => {
    if (indexToRemove < 0 || indexToRemove >= files.length) return;
    
    // Get the file to remove
    const fileToRemove = files[indexToRemove];
    
    // Clean up the blob URL if it exists and is not a storage URL
    if (fileToRemove.preview && !fileToRemove.storageUrl && 
        fileToRemove.preview.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(fileToRemove.preview);
      } catch (error) {
        console.warn('[useRadioFiles] Error revoking blob URL:', error);
      }
    }
    
    // Remove the file from the files array
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    
    // Adjust current index if needed
    if (currentFileIndex >= indexToRemove) {
      if (currentFileIndex > 0 || files.length > 1) {
        const newIndex = Math.max(0, Math.min(currentFileIndex - 1, files.length - 2));
        setCurrentFileIndex(newIndex);
      }
    }
  }, [files, currentFileIndex, setCurrentFileIndex, setFiles]);

  return {
    files,
    currentFile: files[currentFileIndex] || null,
    currentFileIndex,
    setCurrentFileIndex,
    addFiles,
    removeFile,
    isRestoringFiles
  };
};
