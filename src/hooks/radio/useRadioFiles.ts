
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
    
    console.log('Loading files from metadata:', fileMetadata);
    
    // For each metadata entry, create a placeholder File-like object
    try {
      const placeholderFiles = fileMetadata.map(meta => {
        // Create a File-like object with essential properties
        // This is a simplified representation since we can't fully reconstruct a File object
        const placeholderFile = new File(
          // Use an empty array buffer as content
          [new Blob(['placeholder content'])], 
          meta.name, 
          { 
            type: meta.type || 'audio/mpeg', // Default to audio/mpeg if type is missing
            lastModified: meta.lastModified 
          }
        );
        
        // Add the ID property
        Object.defineProperty(placeholderFile, 'id', {
          value: meta.id,
          writable: true,
          enumerable: true
        });
        
        return placeholderFile as UploadedFile;
      });
      
      setFiles(placeholderFiles);
      console.log('Placeholder files created:', placeholderFiles);
    } catch (error) {
      console.error('Error reconstructing files from metadata:', error);
      // Clear metadata if there's an error to prevent future issues
      setFileMetadata([]);
    }
  }, [fileMetadata, setFileMetadata]);
  
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
    // Validate that we have actual File objects
    if (!newFiles || !Array.isArray(newFiles) || newFiles.length === 0) {
      console.error('Invalid files array provided to addFiles');
      return;
    }
    
    console.log('Adding files:', newFiles);
    
    const filesWithIds: UploadedFile[] = [];
    const newMetadata: Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      lastModified: number;
    }> = [];
    
    newFiles.forEach(file => {
      // Validate this is a real File object
      if (!(file instanceof File)) {
        console.error('Invalid file object:', file);
        return;
      }
      
      const id = `file-${uuidv4()}`;
      
      // Create enhanced File object with ID
      const uploadedFile = file as UploadedFile;
      uploadedFile.id = id;
      
      filesWithIds.push(uploadedFile);
      
      // Save metadata
      newMetadata.push({
        id,
        name: file.name,
        size: file.size,
        type: file.type || 'audio/mpeg', // Default to audio/mpeg if type is missing
        lastModified: file.lastModified
      });
    });
    
    // Log what's being added
    console.log('Adding files with IDs:', filesWithIds);
    console.log('Adding metadata:', newMetadata);
    
    // Update files state
    setFiles(prev => [...prev, ...filesWithIds]);
    
    // Update metadata for persistence
    setFileMetadata(prev => [...prev, ...newMetadata]);
  };
  
  const handleRemoveFile = (index: number) => {
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

  // Clear all files
  const clearFiles = () => {
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
