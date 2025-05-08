
import { useState, useEffect, useCallback } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { toast } from "sonner";
import { ensureValidBlobUrl, createNewBlobUrl } from "@/utils/audio-url-validator";
import { UploadedFile } from "@/components/radio/types";

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
          // Reconstruct files if needed
          const reconstructedFiles = await Promise.all(files.map(async (file) => {
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
          }));
          
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
    
    // If this is the first file added, set it as current
    if (files.length === 0 && processedFiles.length > 0) {
      setCurrentFileIndex(0);
    }
  }, [files.length, setCurrentFileIndex, setFiles]);

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
  }, [files, currentFileIndex, setCurrentFileIndex, setFiles]);

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview && file.preview.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(file.preview);
          } catch (error) {
            console.warn('[usePersistentFileStorage] Error revoking blob URL:', error);
          }
        }
      });
    };
  }, [files]);

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
