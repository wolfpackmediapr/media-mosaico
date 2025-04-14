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

  const [files, setFiles] = usePersistentState<UploadedFile[]>(
    'radio-files',
    [],
    { 
      storage: 'sessionStorage',
      serialize: (filesList) => {
        // We can't serialize File objects, so we save just identifiers
        return JSON.stringify(filesList.map((file, index) => ({
          id: file.id || `file-${index}`,
          name: file.name,
          size: file.size,
          type: file.type,
          preview: file.preview
        })));
      },
      deserialize: (serialized) => {
        // Return the simple objects, we'll handle recreation of File objects elsewhere
        return JSON.parse(serialized);
      }
    }
  );
  
  const [fileObjects, setFileObjects] = useState<Record<string, File>>({});
  const [currentFile, setCurrentFile] = useState<UploadedFile | undefined>();
  
  // Whenever the files array changes, make sure each file has an ID
  useEffect(() => {
    if (files.length > 0) {
      const filesWithIds = files.map(file => {
        if (!file.id) {
          return { ...file, id: `file-${uuidv4()}` };
        }
        return file;
      });
      
      if (JSON.stringify(filesWithIds) !== JSON.stringify(files)) {
        setFiles(filesWithIds);
      }
    }
  }, [files]);
  
  // Update currentFile based on currentFileIndex
  useEffect(() => {
    if (files.length > 0 && currentFileIndex < files.length) {
      const file = files[currentFileIndex];
      const fileObject = fileObjects[file.id || file.name];
      
      if (fileObject) {
        // If we have the actual File object, use it with the preview
        setCurrentFile({
          ...fileObject,
          preview: file.preview
        });
      } else {
        // Otherwise just use what we have
        setCurrentFile(file);
      }
    } else {
      setCurrentFile(undefined);
    }
  }, [files, currentFileIndex, fileObjects]);

  // Add file objects to our fileObjects record
  const addFileObjects = (newFiles: File[]) => {
    const newFileObjects: Record<string, File> = {};
    const filesWithPreviews: UploadedFile[] = [];
    
    newFiles.forEach(file => {
      const id = `file-${uuidv4()}`;
      newFileObjects[id] = file;
      
      // Create URL preview
      const preview = URL.createObjectURL(file);
      filesWithPreviews.push({
        ...file,
        id,
        preview
      });
    });
    
    // Update our records
    setFileObjects(prev => ({
      ...prev,
      ...newFileObjects
    }));
    
    // Add to files array
    setFiles(prev => [...prev, ...filesWithPreviews]);
  };
  
  const handleRemoveFile = (index: number) => {
    setFiles(prev => {
      const file = prev[index];
      
      // Revoke URL if it exists
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      
      // Remove file from array
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      
      // If we're removing the current file, adjust currentFileIndex
      if (index === currentFileIndex) {
        if (newFiles.length > 0) {
          setCurrentFileIndex(Math.min(index, newFiles.length - 1));
        } else {
          setCurrentFileIndex(0);
        }
      } else if (index < currentFileIndex) {
        setCurrentFileIndex(currentFileIndex - 1);
      }
      
      return newFiles;
    });
  };

  return {
    files,
    setFiles: addFileObjects,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    handleRemoveFile
  };
}
