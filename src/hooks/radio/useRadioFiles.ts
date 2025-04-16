
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface UploadedFile extends File {
  preview?: string;
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

  // Store file metadata in persistent storage
  const [fileMetadata, setFileMetadata, clearFileMetadata] = usePersistentState<Array<{
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
  
  // Local state for actual File objects (can't persist directly)
  const [files, setFiles] = useState<UploadedFile[]>([]);
  
  // Store current file index in persistent storage
  const [currentFileIndex, setCurrentFileIndex, clearCurrentFileIndex] = usePersistentState<number>(
    `${persistKey}-current-index`,
    0,
    { storage }
  );

  // Initialize file objects from metadata when component mounts
  useEffect(() => {
    // Remove the files.length check that was preventing re-initialization after clearing
    if (fileMetadata.length === 0) return;

    try {
      // Create File objects with previews from metadata
      const reconstructedFiles = fileMetadata.map(meta => {
        // Create a minimal File object with blank content
        const file = new File([""], meta.name, { 
          type: meta.type,
          lastModified: meta.lastModified
        });
        
        // Add size property to match original
        Object.defineProperty(file, 'size', {
          value: meta.size,
          writable: false
        });
        
        // Add preview URL if available
        if (meta.preview) {
          Object.defineProperty(file, 'preview', {
            value: meta.preview,
            writable: true
          });
        }
        
        return file as UploadedFile;
      });
      
      console.log("Reconstructed files from metadata:", reconstructedFiles);
      setFiles(reconstructedFiles);
    } catch (error) {
      console.error("Error reconstructing files from metadata:", error);
      toast.error("Error al cargar archivos guardados");
    }
  }, [fileMetadata]);

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
      
      setFileMetadata(metadata);
    }
  }, [files, setFileMetadata]);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);
  
  const currentFile = files.length > 0 && currentFileIndex < files.length 
    ? files[currentFileIndex] 
    : undefined;
  
  const handleFilesAdded = (newFiles: File[]) => {
    const audioFiles = newFiles.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length < newFiles.length) {
      toast.warning('Se omitieron algunos archivos que no son de audio');
    }

    const uploadedFiles = audioFiles.map((file) => {
      // Create a new File object
      const uploadedFile = new File([file], file.name, { 
        type: file.type,
        lastModified: file.lastModified
      });
      
      // Set size property if needed
      if (uploadedFile.size !== file.size) {
        Object.defineProperty(uploadedFile, 'size', {
          value: file.size,
          writable: false
        });
      }
      
      // Add preview URL
      const previewUrl = URL.createObjectURL(file);
      Object.defineProperty(uploadedFile, 'preview', {
        value: previewUrl,
        writable: true
      });
      
      return uploadedFile as UploadedFile;
    });
    
    setFiles(prevFiles => [...prevFiles, ...uploadedFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      if (newFiles[index]?.preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      
      // Update metadata
      if (newFiles.length === 0) {
        setFileMetadata([]);
      }
      
      // Update current index if needed
      if (currentFileIndex >= newFiles.length && currentFileIndex > 0 && newFiles.length > 0) {
        setCurrentFileIndex(newFiles.length - 1);
      }
      
      return newFiles;
    });
  };

  const clearFiles = () => {
    // Revoke all object URLs
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    
    // Clear states
    setFiles([]);
    clearFileMetadata();
    clearCurrentFileIndex();
  };

  return {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    handleFilesAdded,
    handleRemoveFile,
    clearFiles
  };
};
