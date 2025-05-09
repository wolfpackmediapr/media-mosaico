
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { ensureValidBlobUrl, createNewBlobUrl, isValidFileForBlobUrl, safelyRevokeBlobUrl } from "@/utils/audio-url-validator";

interface UploadedFile extends File {
  preview?: string;
  isReconstructed?: boolean;
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
  }>>(
    `${persistKey}-metadata`,
    [],
    { storage }
  );
  
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isRestoringFiles, setIsRestoringFiles] = useState(false);
  const [hasInvalidFiles, setHasInvalidFiles] = useState(false);
  
  const [currentFileIndex, setCurrentFileIndex] = usePersistentState<number>(
    `${persistKey}-current-index`,
    0,
    { storage }
  );

  const urlsToRevoke = useRef<Set<string>>(new Set());
  
  // Function to safely clean up a file's resources
  const cleanupFile = useCallback((file: UploadedFile | null) => {
    if (!file) return;
    
    // Revoke blob URL if it exists
    if (file.preview) {
      safelyRevokeBlobUrl(file.preview);
    }
  }, []);
  
  // Enhanced file reconstruction with better error handling
  useEffect(() => {
    if (fileMetadata.length === 0 || files.length > 0) return;
    
    const reconstructFiles = async () => {
      setIsRestoringFiles(true);
      let hasAnyInvalidFile = false;
      
      try {
        console.log('[useRadioFiles] Reconstructing files from metadata:', fileMetadata.length);
        const reconstructedFiles = await Promise.all(fileMetadata.map(async (meta) => {
          // Create an empty file with the same metadata
          const file = new File([""], meta.name || "unnamed-file", { 
            type: meta.type || "audio/mpeg",
            lastModified: meta.lastModified || Date.now()
          });
          
          // Set size property
          Object.defineProperty(file, 'size', {
            value: meta.size || 0,
            writable: false
          });
          
          // Set isReconstructed flag to indicate this file was restored from metadata
          Object.defineProperty(file, 'isReconstructed', {
            value: true,
            writable: true
          });
          
          // Mark this file as invalid if it doesn't have proper properties
          const isInvalid = !isValidFileForBlobUrl(file);
          if (isInvalid) {
            hasAnyInvalidFile = true;
            console.warn('[useRadioFiles] Created invalid reconstructed file:', file.name);
          }
          
          // Always create a new empty preview URL for consistency
          // Don't attempt to reuse old URLs as they don't survive page reloads
          let previewUrl = '';
          if (!isInvalid) {
            previewUrl = createNewBlobUrl(file);
          }
          
          Object.defineProperty(file, 'preview', {
            value: previewUrl,
            writable: true
          });
          
          return file as UploadedFile;
        }));
        
        setHasInvalidFiles(hasAnyInvalidFile);
        
        if (hasAnyInvalidFile) {
          console.log('[useRadioFiles] Some files were invalid after reconstruction');
        } else {
          console.log('[useRadioFiles] Successfully reconstructed files:', reconstructedFiles.map(f => f.name));
        }
        
        setFiles(reconstructedFiles);
      } catch (error) {
        console.error("[useRadioFiles] Error reconstructing files from metadata:", error);
        toast.error("Error al cargar archivos guardados");
        setFileMetadata([]);
        setHasInvalidFiles(true);
      } finally {
        setIsRestoringFiles(false);
      }
    };
    
    reconstructFiles();
  }, [fileMetadata, setFileMetadata]);

  // Sync file metadata when files change
  useEffect(() => {
    if (files.length > 0) {
      const metadata = files.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        // Store the preview URL in metadata, but it won't be valid after page reload
        preview: file.preview
      }));
      
      console.log('[useRadioFiles] Syncing file metadata:', metadata.length);
      setFileMetadata(metadata);
    } else if (fileMetadata.length > 0 && files.length === 0) {
      console.log('[useRadioFiles] Clearing file metadata; no files remaining');
      setFileMetadata([]);
    }
  }, [files, setFileMetadata, fileMetadata.length]);

  // Validate blob URLs for current file - with enhanced error handling
  const validateCurrentFileUrl = useCallback(async () => {
    if (files.length === 0 || currentFileIndex >= files.length) return false;
    
    const currentFile = files[currentFileIndex];
    if (!currentFile) return false;
    
    // If the file is invalid or reconstructed with size <= 1, don't attempt validation
    if (!isValidFileForBlobUrl(currentFile)) {
      console.warn('[useRadioFiles] Current file is invalid, cannot validate URL');
      return false;
    }
    
    if (!currentFile.preview) return false;
    
    // Ensure the current file has a valid URL
    try {
      const validUrl = await ensureValidBlobUrl(currentFile);
      
      // If URL changed or is empty, update the file object
      if (validUrl !== currentFile.preview) {
        console.log('[useRadioFiles] Updating blob URL for current file');
        const updatedFiles = [...files];
        
        // Update the preview URL for the current file
        Object.defineProperty(updatedFiles[currentFileIndex], 'preview', {
          value: validUrl,
          writable: true
        });
        
        setFiles(updatedFiles);
      }
      
      return validUrl !== '';
    } catch (error) {
      console.error('[useRadioFiles] Error validating current file URL:', error);
      return false;
    }
  }, [files, currentFileIndex]);

  // Track and cleanup URL objects throughout component lifecycle
  useEffect(() => {
    return () => {
      // Clean up all tracked URLs on unmount
      urlsToRevoke.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore errors on cleanup
        }
      });
      
      // Also clean up any preview URLs in current files
      files.forEach(file => {
        if (file.preview) {
          safelyRevokeBlobUrl(file.preview);
        }
      });
      
      console.log('[useRadioFiles] Cleaned up file object URLs on unmount');
    };
  }, []);

  const currentFile = files.length > 0 && currentFileIndex < files.length && isValidFileForBlobUrl(files[currentFileIndex])
    ? files[currentFileIndex] 
    : null;

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    console.log('[useRadioFiles] handleFilesAdded called. Adding:', newFiles.length, 'files');
    if (!newFiles || newFiles.length === 0) {
      return;
    }
    
    const audioFiles = newFiles.filter(file => file.type.startsWith('audio/'));
    if (audioFiles.length < newFiles.length) {
      toast.warning('Se omitieron algunos archivos que no son de audio');
    }
    
    if (audioFiles.length === 0) {
      toast.error('No se seleccionaron archivos de audio válidos');
      return;
    }
    
    // Create file objects with blob URLs
    const uploadedFiles = audioFiles.map((file) => {
      const uploadedFile = new File([file], file.name, { 
        type: file.type,
        lastModified: file.lastModified
      });
      
      // Set correct size
      if (uploadedFile.size !== file.size) {
        Object.defineProperty(uploadedFile, 'size', {
          value: file.size,
          writable: false
        });
      }
      
      // Only create preview URL for valid files
      let previewUrl = '';
      if (isValidFileForBlobUrl(uploadedFile)) {
        previewUrl = createNewBlobUrl(file);
        if (previewUrl) {
          urlsToRevoke.current.add(previewUrl);
        }
      }
      
      Object.defineProperty(uploadedFile, 'preview', {
        value: previewUrl,
        writable: true
      });
      
      return uploadedFile as UploadedFile;
    });
    
    setFiles(prevFiles => {
      const updatedFiles = [...prevFiles, ...uploadedFiles];
      console.log('[useRadioFiles] Files after adding:', updatedFiles.length);
      
      // Reset the invalid files flag if we're adding new valid files
      if (hasInvalidFiles && uploadedFiles.length > 0 && uploadedFiles.some(f => isValidFileForBlobUrl(f))) {
        setHasInvalidFiles(false);
      }
      
      return updatedFiles;
    });
  }, [hasInvalidFiles]);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      
      // Get the file to remove
      const fileToRemove = newFiles[index];
      
      // Clean up resources for the file being removed
      cleanupFile(fileToRemove);
      
      // Remove from tracked URLs
      if (fileToRemove?.preview) {
        urlsToRevoke.current.delete(fileToRemove.preview);
      }
      
      // Remove the file from array
      newFiles.splice(index, 1);
      
      console.log('[useRadioFiles] handleRemoveFile: files after removal =', newFiles.length);
      
      // Update current file index if needed
      if (currentFileIndex >= newFiles.length && currentFileIndex > 0 && newFiles.length > 0) {
        setCurrentFileIndex(newFiles.length - 1);
        console.log('[useRadioFiles] Updated currentFileIndex:', newFiles.length - 1);
      }
      
      // Check if we still have any invalid files
      const stillHasInvalid = newFiles.some(f => !isValidFileForBlobUrl(f));
      setHasInvalidFiles(stillHasInvalid);
      
      return newFiles;
    });
  }, [currentFileIndex, setCurrentFileIndex, cleanupFile]);

  return {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    isRestoringFiles,
    hasInvalidFiles,
    handleFilesAdded,
    handleRemoveFile,
    validateCurrentFileUrl
  };
};
