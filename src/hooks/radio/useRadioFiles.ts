
import { usePersistentFileStorage } from "./file-management/usePersistentFileStorage";
import { useSupabaseFileStorage } from "./file-management/useSupabaseFileStorage";
import { useFilePreviewUrls } from "./file-management/useFilePreviewUrls";
import { useEffect, useCallback } from "react";
import { UploadedFile } from "@/components/radio/types";
import { useAuthStatus } from "@/hooks/use-auth-status";

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
    // First add files locally with the base hook
    fileStorage.addFiles(newFiles);
    
    // Then upload to Supabase if authenticated 
    if (isAuthenticated) {
      // Upload in the next tick to allow UI to update first
      setTimeout(() => {
        supabaseStorage.syncFilesToSupabase();
      }, 0);
    }
  }, [fileStorage.addFiles, isAuthenticated, supabaseStorage.syncFilesToSupabase]);

  // Sync with Supabase when authentication changes
  useEffect(() => {
    if (isAuthenticated && fileStorage.files.length > 0) {
      supabaseStorage.syncFilesToSupabase();
    }
  }, [isAuthenticated, fileStorage.files, supabaseStorage.syncFilesToSupabase]);

  return {
    files: fileStorage.files,
    currentFile: fileStorage.currentFile,
    currentFileIndex: fileStorage.currentFileIndex, 
    setCurrentFileIndex: fileStorage.setCurrentFileIndex,
    addFiles,
    removeFile: fileStorage.removeFile,
    isRestoringFiles: fileStorage.isRestoringFiles
  };
};
