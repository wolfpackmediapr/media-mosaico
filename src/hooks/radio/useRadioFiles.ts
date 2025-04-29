
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

interface UploadedFile extends File {
  preview?: string;
  isReconstructed?: boolean; // Flag to track reconstructed files
}

interface UseRadioFilesOptions {
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
}

// Create an error tracking object to prevent duplicate errors
const errorTracker = {
  lastShownError: '',
  lastErrorTime: 0,
  ERROR_COOLDOWN: 10000, // 10 seconds between similar errors
  
  canShowError(errorKey: string): boolean {
    const now = Date.now();
    // Always show if it's a different error
    if (errorKey !== this.lastShownError) {
      this.lastShownError = errorKey;
      this.lastErrorTime = now;
      return true;
    }
    
    // Only show the same error after cooldown
    if (now - this.lastErrorTime > this.ERROR_COOLDOWN) {
      this.lastErrorTime = now;
      return true;
    }
    
    return false;
  }
};

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
  const filesReconstructed = useRef<boolean>(false);
  
  const [currentFileIndex, setCurrentFileIndex] = usePersistentState<number>(
    `${persistKey}-current-index`,
    0,
    { storage }
  );

  // Enhanced file reconstruction on mount/tab changes with improved validation
  useEffect(() => {
    if (fileMetadata.length === 0 || files.length > 0 || filesReconstructed.current) return;
    
    try {
      console.log('[useRadioFiles] Attempting to reconstruct files from metadata:', fileMetadata.length);
      
      // Set flag to prevent multiple reconstruction attempts
      filesReconstructed.current = true;
      
      // Filter out invalid metadata entries
      const validMetadata = fileMetadata.filter(meta => 
        meta && meta.name && meta.type && meta.size > 0
      );
      
      if (validMetadata.length === 0) {
        console.log('[useRadioFiles] No valid metadata to reconstruct files from');
        return;
      }
      
      const reconstructedFiles = validMetadata.map(meta => {
        // Create an empty file with the same metadata
        const file = new File([""], meta.name, { 
          type: meta.type,
          lastModified: meta.lastModified
        }) as UploadedFile;
        
        // Set size property
        Object.defineProperty(file, 'size', {
          value: meta.size,
          writable: false
        });
        
        // Mark as reconstructed for special handling
        file.isReconstructed = true;
        
        // Add preview URL if available
        if (meta.preview) {
          Object.defineProperty(file, 'preview', {
            value: meta.preview,
            writable: true
          });
        }
        
        return file;
      });
      
      console.log('[useRadioFiles] Successfully reconstructed files:', reconstructedFiles.map(f => f.name));
      setFiles(reconstructedFiles);
    } catch (error) {
      console.error("[useRadioFiles] Error reconstructing files from metadata:", error);
      
      // Only show error if we haven't recently shown one
      if (errorTracker.canShowError('file-reconstruction')) {
        toast.error("Error al cargar archivos guardados");
      }
      
      // Clear metadata to prevent repeated errors
      setFileMetadata([]);
      filesReconstructed.current = false;
    }
  }, [fileMetadata, setFileMetadata]);

  // Sync file metadata when files change
  useEffect(() => {
    if (files.length > 0) {
      const metadata = files.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        preview: file.preview
      }));
      
      console.log('[useRadioFiles] Syncing file metadata:', metadata.length);
      setFileMetadata(metadata);
    } else if (fileMetadata.length > 0 && files.length === 0) {
      console.log('[useRadioFiles] Clearing file metadata; no files remaining');
      setFileMetadata([]);
    }
  }, [files, setFileMetadata, fileMetadata.length]);

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
    : undefined;

  const handleFilesAdded = (newFiles: File[]) => {
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
    
    const uploadedFiles = audioFiles.map((file) => {
      const uploadedFile = new File([file], file.name, { 
        type: file.type,
        lastModified: file.lastModified
      }) as UploadedFile;
      
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
      
      // Real files are not reconstructed
      uploadedFile.isReconstructed = false;
      
      return uploadedFile;
    });
    
    setFiles(prevFiles => {
      const updatedFiles = [...prevFiles, ...uploadedFiles];
      console.log('[useRadioFiles] Files after adding:', updatedFiles.length);
      return updatedFiles;
    });
  };

  const handleRemoveFile = (index: number) => {
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
  };

  return {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    handleFilesAdded,
    handleRemoveFile
  };
};
