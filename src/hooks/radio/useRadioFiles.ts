
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { toast } from "sonner";

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
    if (!fileMetadata || fileMetadata.length === 0) {
      console.log('No file metadata found in session storage');
      return;
    }
    
    console.log('Loading files from metadata:', fileMetadata);
    
    try {
      // For each metadata entry, create a placeholder File-like object
      const placeholderFiles = fileMetadata.map(meta => {
        if (!meta || !meta.name) {
          console.error('Invalid metadata entry:', meta);
          throw new Error('Invalid metadata entry');
        }
        
        console.log('Creating placeholder for file:', meta.name);
        
        try {
          // Create a small placeholder blob with MIME type
          const contentType = meta.type || 'audio/mpeg';
          const placeholderContent = new Blob(['audio placeholder content'], { type: contentType });
          
          // Create a File object with the metadata
          const file = new File([placeholderContent], meta.name, {
            type: contentType,
            lastModified: meta.lastModified
          });
          
          // Add the id property
          const uploadedFile = file as UploadedFile;
          uploadedFile.id = meta.id;
          
          return uploadedFile;
        } catch (fileError) {
          console.error('Error creating placeholder file:', fileError);
          throw fileError;
        }
      });
      
      setFiles(placeholderFiles);
      console.log('Placeholder files created:', placeholderFiles);
    } catch (error) {
      console.error('Error reconstructing files from metadata:', error);
      // Clear metadata if there's an error to prevent future issues
      setFileMetadata([]);
      toast.error("Error recuperando archivos de la sesión anterior");
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
      
      if (file.size === 0) {
        console.error('File has zero size, skipping:', file.name);
        toast.error(`El archivo ${file.name} está vacío`);
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
    
    if (filesWithIds.length === 0) {
      console.log('No valid files to add after validation');
      return;
    }
    
    // Update files state
    setFiles(prev => [...prev, ...filesWithIds]);
    
    // Update metadata for persistence
    setFileMetadata(prev => [...prev, ...newMetadata]);
    
    // Update current file index to point to the first new file if no files existed before
    if (files.length === 0 && filesWithIds.length > 0) {
      setCurrentFileIndex(0);
    }
  };
  
  const handleRemoveFile = (index: number) => {
    if (index < 0 || index >= files.length) {
      console.error('Invalid file index to remove:', index);
      return;
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
