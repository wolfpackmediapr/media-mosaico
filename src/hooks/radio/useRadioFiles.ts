
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
}

interface UseRadioFilesOptions {
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
}

export const useRadioFiles = (options: UseRadioFilesOptions = {}) => {
  const {
    persistKey = "radio-files",
    storage = 'sessionStorage',
  } = options;

  const [fileMetadata, setFileMetadata] = usePersistentState<Array<{
    name: string;
    type: string;
    size: number;
    lastModified: number;
    preview?: string;
    storagePath?: string;
    storageUrl?: string;
    id?: string;
  }>>(
    `${persistKey}-metadata`,
    [],
    { storage }
  );
  
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isRestoringFiles, setIsRestoringFiles] = useState(false);
  const { isAuthenticated } = useAuthStatus();
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  
  const [currentFileIndex, setCurrentFileIndex] = usePersistentState<number>(
    `${persistKey}-current-index`,
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
      setFileMetadata(prev => prev.map(meta => 
        meta.name === file.name ? {
          ...meta,
          storagePath: result.path,
          storageUrl: result.url
        } : meta
      ));
      
      console.log('[useRadioFiles] File uploaded successfully:', result.path);
      return true;
    } catch (error) {
      console.error('[useRadioFiles] Error uploading file:', error);
      return false;
    } finally {
      setIsUploading(prev => ({ ...prev, [file.name]: false }));
    }
  }, [isAuthenticated, setFileMetadata, isUploading]);

  // Enhanced file reconstruction - with proper storage URLs handling
  useEffect(() => {
    if (fileMetadata.length === 0 || files.length > 0) return;
    
    const reconstructFiles = async () => {
      setIsRestoringFiles(true);
      try {
        console.log('[useRadioFiles] Reconstructing files from metadata:', fileMetadata.length);
        const reconstructedFiles = await Promise.all(fileMetadata.map(async (meta) => {
          // Create an empty file with the same metadata
          const file = new File([""], meta.name, { 
            type: meta.type,
            lastModified: meta.lastModified
          });
          
          // Set size property
          Object.defineProperty(file, 'size', {
            value: meta.size,
            writable: false
          });
          
          // Set isReconstructed flag to indicate this file was restored from metadata
          Object.defineProperty(file, 'isReconstructed', {
            value: true,
            writable: true
          });
          
          // Set Supabase storage path and URL if available
          if (meta.storagePath) {
            Object.defineProperty(file, 'storagePath', {
              value: meta.storagePath,
              writable: true
            });
          }
          
          // Prefer Supabase URL if available for the preview
          if (meta.storageUrl) {
            Object.defineProperty(file, 'storageUrl', {
              value: meta.storageUrl,
              writable: true
            });
            
            Object.defineProperty(file, 'preview', {
              value: meta.storageUrl,
              writable: true
            });
            
            console.log('[useRadioFiles] Restored file with storage URL:', meta.storageUrl);
          } else {
            // Fallback to creating a new blob URL
            const newPreviewUrl = createNewBlobUrl(file);
            Object.defineProperty(file, 'preview', {
              value: newPreviewUrl,
              writable: true
            });
            
            console.log('[useRadioFiles] Restored file with new blob URL');
          }
          
          // Set ID if available
          if (meta.id) {
            Object.defineProperty(file, 'id', {
              value: meta.id,
              writable: true
            });
          }
          
          return file as UploadedFile;
        }));
        
        setFiles(reconstructedFiles);
        
        // If we're authenticated, try to upload files without storage URLs
        if (isAuthenticated) {
          reconstructedFiles.forEach(file => {
            if (!file.storageUrl) {
              console.log('[useRadioFiles] File needs to be uploaded to storage:', file.name);
              // No await - let it happen in background
              uploadFileToStorage(file);
            }
          });
        }
      } catch (error) {
        console.error('[useRadioFiles] Error reconstructing files:', error);
        toast.error('Error restoring audio files');
      } finally {
        setIsRestoringFiles(false);
      }
    };
    
    reconstructFiles();
  }, [fileMetadata, isAuthenticated, uploadFileToStorage]);

  // Save metadata when files change
  useEffect(() => {
    if (isRestoringFiles || files.length === 0) return;
    
    const metadata = files.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      preview: (file.storageUrl || file.preview) as string,
      storagePath: file.storagePath as string | undefined,
      storageUrl: file.storageUrl as string | undefined,
      id: 'id' in file ? file.id : undefined
    }));
    
    setFileMetadata(metadata);
  }, [files, setFileMetadata, isRestoringFiles]);

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
  }, [files.length, setCurrentFileIndex, isAuthenticated, uploadFileToStorage]);

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
  }, [files, currentFileIndex, setCurrentFileIndex]);

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
