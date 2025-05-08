
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ensureValidBlobUrl, createNewBlobUrl } from "@/utils/audio-url-validator";

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
  
  const [currentFileIndex, setCurrentFileIndex] = usePersistentState<number>(
    `${persistKey}-current-index`,
    0,
    { storage }
  );

  // Enhanced file reconstruction - now with proper blob URL handling
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
          
          // Always create a new blob URL instead of trying to reuse the old one
          // Since blob URLs don't survive page reloads
          const newPreviewUrl = createNewBlobUrl(file);
          Object.defineProperty(file, 'preview', {
            value: newPreviewUrl,
            writable: true
          });
          
          return file as UploadedFile;
        }));
        
        console.log('[useRadioFiles] Successfully reconstructed files:', reconstructedFiles.map(f => f.name));
        setFiles(reconstructedFiles);
      } catch (error) {
        console.error("[useRadioFiles] Error reconstructing files from metadata:", error);
        toast.error("Error al cargar archivos guardados");
        setFileMetadata([]);
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

  // Validate blob URLs for current file - useful to check before playback
  const validateCurrentFileUrl = useCallback(async () => {
    if (files.length === 0 || currentFileIndex >= files.length) return false;
    
    const currentFile = files[currentFileIndex];
    if (!currentFile || !currentFile.preview) return false;
    
    // Ensure the current file has a valid URL
    try {
      const validUrl = await ensureValidBlobUrl(currentFile);
      
      // If URL changed, update the file object
      if (validUrl !== currentFile.preview) {
        console.log('[useRadioFiles] Updating invalid blob URL for current file');
        const updatedFiles = [...files];
        
        // Update the preview URL for the current file
        Object.defineProperty(updatedFiles[currentFileIndex], 'preview', {
          value: validUrl,
          writable: true
        });
        
        setFiles(updatedFiles);
      }
      
      return true;
    } catch (error) {
      console.error('[useRadioFiles] Error validating current file URL:', error);
      return false;
    }
  }, [files, currentFileIndex]);

  // Cleanup URL objects on unmount
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      console.log('[useRadioFiles] Cleaned up file object URLs on unmount');
    };
  }, []);

  const currentFile = files.length > 0 && currentFileIndex < files.length 
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
      
      // Create and store preview URL
      const previewUrl = URL.createObjectURL(file);
      Object.defineProperty(uploadedFile, 'preview', {
        value: previewUrl,
        writable: true
      });
      
      return uploadedFile as UploadedFile;
    });
    
    setFiles(prevFiles => {
      const updatedFiles = [...prevFiles, ...uploadedFiles];
      console.log('[useRadioFiles] Files after adding:', updatedFiles.length);
      return updatedFiles;
    });
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      // Revoke object URL before removing
      if (newFiles[index]?.preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      
      newFiles.splice(index, 1);
      console.log('[useRadioFiles] handleRemoveFile: files after removal =', newFiles.length);
      
      // Update current file index if needed
      if (currentFileIndex >= newFiles.length && currentFileIndex > 0 && newFiles.length > 0) {
        setCurrentFileIndex(newFiles.length - 1);
        console.log('[useRadioFiles] Updated currentFileIndex:', newFiles.length - 1);
      }
      
      return newFiles;
    });
  }, [currentFileIndex, setCurrentFileIndex]);

  return {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    isRestoringFiles,
    handleFilesAdded,
    handleRemoveFile,
    validateCurrentFileUrl
  };
};
