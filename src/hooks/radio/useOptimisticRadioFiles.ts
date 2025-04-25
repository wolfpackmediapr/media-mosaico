import { useState, useCallback } from 'react';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { toast } from 'sonner';
import { UploadedFile } from '@/components/radio/types';
import { v4 as uuidv4 } from 'uuid';

interface UseRadioFilesOptions {
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
}

export function useOptimisticRadioFiles({ persistKey = "radio-files", storage = "sessionStorage" }: UseRadioFilesOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = usePersistentState<UploadedFile[]>(persistKey, [], { storage });
  const [currentFileIndex, setCurrentFileIndex] = usePersistentState<number>(`${persistKey}-current-index`, 0, { storage });
  
  /**
   * Generate preview for file
   */
  const getFilePreview = useCallback((file: File): string => {
    return URL.createObjectURL(file);
  }, []);
  
  /**
   * Add files with optimistic UI
   */
  const handleFilesAdded = useCallback((newFiles: File[]) => {
    setIsUploading(true);
    
    try {
      // Filter files to only keep audio files
      const audioFiles = newFiles.filter(file => file.type.startsWith('audio/'));
      
      if (audioFiles.length === 0) {
        toast.error('No se encontraron archivos de audio válidos');
        return;
      }
      
      if (audioFiles.length !== newFiles.length) {
        toast.warning(`Se omitieron ${newFiles.length - audioFiles.length} archivos no válidos`);
      }
      
      // Create optimistic updates with previews
      const uploadedFiles = audioFiles.map(file => ({
        id: uuidv4(),
        file,
        preview: getFilePreview(file),
        isOptimistic: true // Flag to identify optimistic entries
      })) as UploadedFile[];
      
      // Optimistically update UI
      setFiles(prevFiles => [...prevFiles, ...uploadedFiles]);
      
      // If this is the first file, set it as current
      if (!files.length) {
        setCurrentFileIndex(0);
      }
      
      toast.success(`${audioFiles.length} archivos agregados`);
      
      return uploadedFiles;
    } catch (error) {
      console.error('Error handling files:', error);
      toast.error('Error al agregar archivos');
      return [];
    } finally {
      setIsUploading(false);
    }
  }, [files.length, getFilePreview, setCurrentFileIndex, setFiles]);
  
  /**
   * Remove file with optimistic UI
   */
  const handleRemoveFile = useCallback((indexToRemove: number) => {
    setFiles(prevFiles => {
      // Get the file to be removed
      const fileToRemove = prevFiles[indexToRemove];
      
      // Clean up URL object if it exists
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      
      // Create new array without the removed file
      const newFiles = prevFiles.filter((_, i) => i !== indexToRemove);
      
      // Update current file index if needed
      if (currentFileIndex >= indexToRemove) {
        // If we're removing the current file, set index to previous file
        // unless we're at the beginning, then go to next file (which is now at the same index)
        const newIndex = currentFileIndex === 0 ? 0 : 
          currentFileIndex === indexToRemove ? Math.max(0, currentFileIndex - 1) : currentFileIndex - 1;
        
        // Only update if there's a change
        if (newIndex !== currentFileIndex) {
          setCurrentFileIndex(newIndex);
        }
      }
      
      return newFiles;
    });
    
    toast.info('Archivo eliminado');
  }, [currentFileIndex, setCurrentFileIndex, setFiles]);
  
  const currentFile = files[currentFileIndex];
  
  return {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    isUploading,
    handleFilesAdded,
    handleRemoveFile
  };
}
