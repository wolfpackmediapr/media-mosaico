import { useState, useCallback, useEffect } from 'react';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { toast } from 'sonner';
import { UploadedFile } from '@/components/radio/types';
import { v4 as uuidv4 } from 'uuid';
import { useResourceManager } from '@/utils/resourceCleanup';
import { uploadAudioToSupabase, deleteAudioFromSupabase } from '@/utils/supabase-storage-helper';
import { useAuthStatus } from '@/hooks/use-auth-status';

interface UseRadioFilesOptions {
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
}

export function useOptimisticRadioFiles({ persistKey = "radio-files", storage = "sessionStorage" }: UseRadioFilesOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = usePersistentState<UploadedFile[]>(persistKey, [], { storage });
  const [currentFileIndex, setCurrentFileIndex] = usePersistentState<number>(`${persistKey}-current-index`, 0, { storage });
  const resourceManager = useResourceManager();
  const { isAuthenticated } = useAuthStatus();
  
  /**
   * Generate preview for file
   */
  const getFilePreview = useCallback((file: File, storedUrl?: string): string => {
    // If we have a stored Supabase URL, use that
    if (storedUrl && storedUrl.includes('supabase')) {
      return storedUrl;
    }
    
    // Otherwise create a blob URL as a fallback
    const preview = URL.createObjectURL(file);
    resourceManager.trackUrl(preview);
    return preview;
  }, [resourceManager]);
  
  /**
   * Ensure previews are revoked on component unmount
   */
  useEffect(() => {
    return () => {
      // Clean up all temporary URL objects to prevent memory leaks
      files.forEach(file => {
        // Only revoke blob URLs, not Supabase URLs
        if (file.preview && file.preview.startsWith('blob:')) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);
  
  /**
   * Add files with optimistic UI and upload to Supabase
   */
  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    setIsUploading(true);
    
    try {
      // Filter files to only keep audio files
      const audioFiles = newFiles.filter(file => file.type.startsWith('audio/'));
      
      if (audioFiles.length === 0) {
        toast.error('No se encontraron archivos de audio válidos');
        return [];
      }
      
      if (audioFiles.length !== newFiles.length) {
        toast.warning(`Se omitieron ${newFiles.length - audioFiles.length} archivos no válidos`);
      }
      
      // Create optimistic updates with previews
      const uploadedFiles: UploadedFile[] = audioFiles.map(file => {
        // Create temporary preview URL
        const preview = URL.createObjectURL(file);
        resourceManager.trackUrl(preview);
        
        // Create unique ID for file
        const id = uuidv4();
        
        // Create a new file object with additional properties
        const uploadedFile = new File([file], file.name, { 
          type: file.type,
          lastModified: file.lastModified 
        }) as UploadedFile;
        
        // Add the custom properties
        uploadedFile.preview = preview;
        uploadedFile.id = id;
        uploadedFile.isOptimistic = true;
        
        // Copy other properties from the original file
        Object.entries(file).forEach(([key, value]) => {
          if (!(key in uploadedFile) && key !== 'stream') {
            (uploadedFile as any)[key] = value;
          }
        });
        
        return uploadedFile;
      });
      
      // Optimistically update UI
      setFiles(prevFiles => [...prevFiles, ...uploadedFiles]);
      
      // If this is the first file, set it as current
      if (!files.length) {
        setCurrentFileIndex(0);
      }
      
      // Upload files to Supabase in the background if authenticated
      if (isAuthenticated) {
        // Process each file to upload to Supabase
        uploadedFiles.forEach(async (file, index) => {
          try {
            const result = await uploadAudioToSupabase(file);
            if (result.error) {
              console.error(`Error uploading file ${file.name}:`, result.error);
              return;
            }
            
            // Update the file with the Supabase URL
            setFiles(prevFiles => {
              const updatedFiles = [...prevFiles];
              const fileIndex = updatedFiles.findIndex(f => f.id === file.id);
              
              if (fileIndex !== -1) {
                // Store Supabase paths/URLs in the file object
                updatedFiles[fileIndex].storagePath = result.path;
                updatedFiles[fileIndex].storageUrl = result.url;
                updatedFiles[fileIndex].isOptimistic = false;
                
                // Replace blob URL with Supabase URL for better persistence
                if (updatedFiles[fileIndex].preview && updatedFiles[fileIndex].preview.startsWith('blob:')) {
                  URL.revokeObjectURL(updatedFiles[fileIndex].preview!);
                  updatedFiles[fileIndex].preview = result.url;
                }
              }
              
              return updatedFiles;
            });
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
          }
        });
      } else {
        console.log("User not authenticated. Files will use temporary blob URLs only.");
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
  }, [files.length, getFilePreview, isAuthenticated, resourceManager, setCurrentFileIndex, setFiles]);
  
  /**
   * Remove file with optimistic UI and delete from storage
   */
  const handleRemoveFile = useCallback(async (indexToRemove: number) => {
    // Get the file to be removed
    const fileToRemove = files[indexToRemove];
    
    setFiles(prevFiles => {
      // Create new array without the removed file
      const newFiles = prevFiles.filter((_, i) => i !== indexToRemove);
      
      // Update current file index if needed
      if (currentFileIndex >= indexToRemove) {
        // If we're removing the current file, set index to previous file
        // unless we're at the beginning, then go to next file (which is now at the same index)
        const newIndex = currentFileIndex === 0 ? 0 : 
          currentFileIndex === indexToRemove ? Math.max(0, currentFileIndex - 1) : currentFileIndex - 1;
        
        // Only update if there's a change and if there are files left
        if (newIndex !== currentFileIndex && newFiles.length > 0) {
          setCurrentFileIndex(newIndex);
        } else if (newFiles.length === 0) {
          setCurrentFileIndex(0);
        }
      }
      
      return newFiles;
    });
    
    // Clean up resources
    if (fileToRemove) {
      // Clean up URL object if it's a blob URL
      if (fileToRemove.preview && fileToRemove.preview.startsWith('blob:')) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      
      // Delete from Supabase if it was uploaded
      if (isAuthenticated && fileToRemove.storagePath) {
        try {
          await deleteAudioFromSupabase(fileToRemove.storagePath);
        } catch (error) {
          console.error('Error deleting file from storage:', error);
        }
      }
    }
    
    toast.info('Archivo eliminado');
  }, [currentFileIndex, files, isAuthenticated, setCurrentFileIndex, setFiles]);
  
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
