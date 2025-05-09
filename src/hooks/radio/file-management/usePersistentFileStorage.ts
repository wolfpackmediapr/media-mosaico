
import { useState, useEffect, useCallback } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { toast } from "sonner";
import { ensureValidBlobUrl, createNewBlobUrl } from "@/utils/audio-url-validator";
import { UploadedFile } from "@/components/radio/types";
import { useResourceManager } from "@/utils/resourceCleanup";

interface UsePersistentFileStorageOptions {
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
  maxFiles?: number;
}

interface UsePersistentFileStorageReturn {
  files: UploadedFile[];
  currentFile: UploadedFile | null;
  currentFileIndex: number;
  setCurrentFileIndex: React.Dispatch<React.SetStateAction<number>>;
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  addFiles: (newFiles: File[]) => void;
  removeFile: (indexToRemove: number) => void;
  isRestoringFiles: boolean;
}

/**
 * Hook for managing persistent file storage with previews and current selection
 */
export const usePersistentFileStorage = ({
  persistKey = 'radio-files',
  storage = 'sessionStorage',
  maxFiles = 10
}: UsePersistentFileStorageOptions): UsePersistentFileStorageReturn => {
  // Fixed: Properly pass persistKey as a string to usePersistentState as the first parameter
  const [files, setFiles] = usePersistentState<UploadedFile[]>(persistKey, [], {
    storage
  });
  
  const [isRestoringFiles, setIsRestoringFiles] = useState(false);
  const resourceManager = useResourceManager();
  
  // Create a proper string for the index key
  const indexKey = `${persistKey || 'radio-files'}-current-index`;
  
  // Use the correct parameter order: key, initialValue, options
  const [currentFileIndex, setCurrentFileIndex] = usePersistentState<number>(
    indexKey,
    0,
    { storage }
  );

  // Fix: Handle file restoration logic in a useEffect
  useEffect(() => {
    const restoreFiles = async () => {
      if (files.length > 0) {
        setIsRestoringFiles(true);
        console.log('[usePersistentFileStorage] Restoring files from storage', files);
        
        try {
          // Process files in small batches to prevent UI freeze
          const reconstructedFiles = [];
          const batchSize = 2;
          
          for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (file) => {
              // Ensure we only use string IDs
              const fileId = typeof file.id === 'string' ? file.id : 
                          (file.id ? String(file.id) : '');
              
              // Track any blob URLs in the resource manager
              if (file.preview && file.preview.startsWith('blob:')) {
                resourceManager.trackUrl(file.preview);
              }
              
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
            }));
            
            reconstructedFiles.push(...batchResults);
            
            // Small yield to prevent UI freezing
            if (i + batchSize < files.length) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
          
          // Only update if we need to
          if (JSON.stringify(reconstructedFiles) !== JSON.stringify(files)) {
            setFiles(reconstructedFiles);
          }
        } catch (err) {
          console.error('[usePersistentFileStorage] Error reconstructing files:', err);
        } finally {
          setIsRestoringFiles(false);
        }
      }
    };
    
    restoreFiles();
  }, []);

  // Handle adding new files with resource tracking
  const addFiles = useCallback((newFiles: File[]) => {
    const processedFiles = newFiles.map(file => {
      const uploadedFile = file as UploadedFile;
      
      // Create a preview URL if not already present
      if (!uploadedFile.preview) {
        uploadedFile.preview = URL.createObjectURL(file);
        // Track the URL for later cleanup
        resourceManager.trackUrl(uploadedFile.preview);
      }
      
      return uploadedFile;
    });
    
    setFiles(prev => [...prev, ...processedFiles]);
    
    // If this is the first file added, set it as current
    if (files.length === 0 && processedFiles.length > 0) {
      setCurrentFileIndex(0);
    }
  }, [files.length, setCurrentFileIndex, setFiles, resourceManager]);

  // Remove a file and cleanup resources
  const removeFile = useCallback((indexToRemove: number) => {
    if (indexToRemove < 0 || indexToRemove >= files.length) return;
    
    // Get the file to remove
    const fileToRemove = files[indexToRemove];
    
    // Clean up the blob URL if it exists and is not a storage URL
    if (fileToRemove.preview && !fileToRemove.storageUrl && 
        fileToRemove.preview.startsWith('blob:')) {
      try {
        resourceManager.revokeUrl(fileToRemove.preview);
      } catch (error) {
        console.warn('[usePersistentFileStorage] Error revoking blob URL:', error);
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
  }, [files, currentFileIndex, setCurrentFileIndex, setFiles, resourceManager]);

  // Cleanup blob URLs when component unmounts - let the resource manager handle this
  useEffect(() => {
    // No need to do explicit cleanup here, the resourceManager will handle it
    return () => {
      // This empty return is intentional - cleanup is handled by resourceManager
    };
  }, []);

  return {
    files,
    setFiles,
    currentFile: files[currentFileIndex] || null,
    currentFileIndex,
    setCurrentFileIndex,
    addFiles,
    removeFile,
    isRestoringFiles
  };
};
