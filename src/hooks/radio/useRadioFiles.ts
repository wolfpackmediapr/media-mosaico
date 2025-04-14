
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { usePersistentState } from '@/hooks/use-persistent-state';

interface UploadedFile extends File {
  preview?: string;
  id?: string;
}

export function useRadioFiles() {
  const [currentFileIndex, setCurrentFileIndex] = usePersistentState<number>(
    'radio-current-file-index',
    0,
    { storage: 'sessionStorage' }
  );

  const [fileMetadata, setFileMetadata] = usePersistentState<Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    lastModified: number;
  }>>(
    'radio-files-metadata',
    [],
    { storage: 'sessionStorage' }
  );
  
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [currentFile, setCurrentFile] = useState<UploadedFile | undefined>();
  
  // Load files from metadata on initial mount
  useEffect(() => {
    // Clear files state to prevent duplicates
    setFiles([]);
    
    // Don't try to process empty metadata
    if (fileMetadata.length === 0) return;
    
    // For each metadata entry, create a preview placeholder
    const placeholderFiles = fileMetadata.map(meta => {
      // Create a minimal File-like object with essential properties
      const placeholderFile = {
        name: meta.name,
        size: meta.size,
        type: meta.type,
        lastModified: meta.lastModified,
        id: meta.id,
        // This will be a placeholder until the user interacts with the file
        preview: undefined
      } as UploadedFile;
      
      return placeholderFile;
    });
    
    setFiles(placeholderFiles);
  }, [fileMetadata]);
  
  // Update currentFile based on currentFileIndex
  useEffect(() => {
    if (files.length > 0 && currentFileIndex < files.length) {
      setCurrentFile(files[currentFileIndex]);
    } else {
      setCurrentFile(undefined);
    }
  }, [files, currentFileIndex]);

  // Add new files
  const addFiles = (newFiles: File[]) => {
    const filesWithPreviews: UploadedFile[] = [];
    const newMetadata: Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      lastModified: number;
    }> = [];
    
    newFiles.forEach(file => {
      const id = `file-${uuidv4()}`;
      
      // Create URL preview
      let preview: string | undefined;
      try {
        preview = URL.createObjectURL(file);
      } catch (error) {
        console.error('Error creating object URL:', error);
        preview = undefined;
      }
      
      // Create File with preview
      const uploadedFile = {
        ...file,
        id,
        preview
      } as UploadedFile;
      
      filesWithPreviews.push(uploadedFile);
      
      // Save metadata
      newMetadata.push({
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
    });
    
    // Update files state
    setFiles(prev => [...prev, ...filesWithPreviews]);
    
    // Update metadata for persistence
    setFileMetadata(prev => [...prev, ...newMetadata]);
  };
  
  const handleRemoveFile = (index: number) => {
    // Revoke URL if it exists
    if (files[index]?.preview) {
      try {
        URL.revokeObjectURL(files[index].preview!);
      } catch (error) {
        console.error('Error revoking object URL:', error);
      }
    }
    
    // Remove file from array
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
    
    // Remove from metadata
    setFileMetadata(prev => {
      const newMetadata = [...prev];
      newMetadata.splice(index, 1);
      return newMetadata;
    });
    
    // Adjust currentFileIndex if needed
    if (index === currentFileIndex) {
      if (files.length > 1) {
        setCurrentFileIndex(Math.min(index, files.length - 2));
      } else {
        setCurrentFileIndex(0);
      }
    } else if (index < currentFileIndex) {
      setCurrentFileIndex(currentFileIndex - 1);
    }
  };

  // Clear all files (useful when navigating away)
  const clearFiles = () => {
    // Revoke all object URLs
    files.forEach(file => {
      if (file.preview) {
        try {
          URL.revokeObjectURL(file.preview);
        } catch (error) {
          console.error('Error revoking object URL:', error);
        }
      }
    });
    
    // Clear states
    setFiles([]);
    setFileMetadata([]);
    setCurrentFileIndex(0);
  };

  return {
    files,
    setFiles: addFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    handleRemoveFile,
    clearFiles
  };
}
