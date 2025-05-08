
import { usePersistentFileStorage } from "./file-management/usePersistentFileStorage";
import { useSupabaseFileStorage } from "./file-management/useSupabaseFileStorage";
import { useFilePreviewUrls } from "./file-management/useFilePreviewUrls";
import { useEffect, useCallback } from "react";
import { UploadedFile } from "@/components/radio/types";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { toast } from "sonner";

interface UseRadioFilesOptions {
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
  maxFiles?: number;
}

interface UseRadioFilesReturn {
  files: UploadedFile[];
  currentFile: UploadedFile | null;
  currentFileIndex: number;
  setCurrentFileIndex: React.Dispatch<React.SetStateAction<number>>;
  addFiles: (newFiles: File[]) => void;
  removeFile: (indexToRemove: number) => void;
  isRestoringFiles: boolean;
  uploadProgress: Record<string, number>;
  isUploading: Record<string, boolean>;
  cancelUpload: (fileName: string) => void;
}

export const useRadioFiles = ({
  persistKey = 'radio-files',
  storage = 'sessionStorage',
  maxFiles = 10
}: UseRadioFilesOptions): UseRadioFilesReturn => {
  // Use our persistent file storage hook for basic file management
  const fileStorage = usePersistentFileStorage({ persistKey, storage, maxFiles });
  
  // Get authentication status
  const { isAuthenticated } = useAuthStatus();
  
  // Use our Supabase integration hook for cloud storage
  const supabaseStorage = useSupabaseFileStorage({
    files: fileStorage.files,
    setFiles: fileStorage.setFiles
  });
  
  // Use our preview URL management hook
  useFilePreviewUrls({
    files: fileStorage.files,
    setFiles: fileStorage.setFiles
  });
  
  // Enhanced file handling with Supabase integration
  const addFiles = useCallback((newFiles: File[]) => {
    if (!newFiles.length) return;
    
    // Filter for audio files
    const audioFiles = newFiles.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length === 0) {
      toast.error('No se seleccionaron archivos de audio válidos');
      return;
    }
    
    if (audioFiles.length < newFiles.length) {
      toast.warning(`Se omitieron ${newFiles.length - audioFiles.length} archivos que no son de audio`);
    }
    
    // First add files locally with the base hook
    fileStorage.addFiles(audioFiles);
    
    // Show success message
    toast.success(`${audioFiles.length} archivo(s) añadido(s) correctamente`);
    
    // Then upload to Supabase if authenticated - in the next tick 
    // to allow UI to update first
    if (isAuthenticated) {
      setTimeout(() => {
        supabaseStorage.syncFilesToSupabase();
      }, 100);
    }
  }, [fileStorage.addFiles, isAuthenticated, supabaseStorage.syncFilesToSupabase]);

  // Enhanced remove file with cleanup
  const removeFile = useCallback((indexToRemove: number) => {
    const fileToRemove = fileStorage.files[indexToRemove];
    
    if (fileToRemove) {
      // Cancel any ongoing upload
      if (fileToRemove.name && supabaseStorage.isUploading[fileToRemove.name]) {
        supabaseStorage.cancelUpload(fileToRemove.name);
      }
    }
    
    // Remove the file using base hook
    fileStorage.removeFile(indexToRemove);
    
  }, [fileStorage.files, fileStorage.removeFile, supabaseStorage]);

  // Sync with Supabase when authentication changes
  useEffect(() => {
    if (isAuthenticated && fileStorage.files.length > 0 && !fileStorage.isRestoringFiles) {
      // Wait for the component to stabilize before syncing
      const timeoutId = setTimeout(() => {
        supabaseStorage.syncFilesToSupabase();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, fileStorage.files, fileStorage.isRestoringFiles, supabaseStorage.syncFilesToSupabase]);

  return {
    files: fileStorage.files,
    currentFile: fileStorage.currentFile,
    currentFileIndex: fileStorage.currentFileIndex, 
    setCurrentFileIndex: fileStorage.setCurrentFileIndex,
    addFiles,
    removeFile,
    isRestoringFiles: fileStorage.isRestoringFiles,
    uploadProgress: supabaseStorage.uploadProgress,
    isUploading: supabaseStorage.isUploading,
    cancelUpload: supabaseStorage.cancelUpload
  };
};
