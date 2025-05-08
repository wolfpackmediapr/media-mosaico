
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { UploadedFile } from '@/components/radio/types';

interface UseRadioActionsProps {
  files: UploadedFile[];
  currentFileIndex: number;
  setFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  setCurrentFileIndex: (index: number) => void;
  handleFilesAddedOriginal: (newFiles: File[]) => void; // Renamed to avoid conflict
  resetTranscription: () => void;
  setNewsSegments: React.Dispatch<React.SetStateAction<any[]>>; // Use specific type if available
  clearAllStorageState: () => Promise<void>; // Update return type to Promise<void>
  // Add resetPlaybackErrors if needed from useRadioPlayer
}

export const useRadioActions = ({
  files,
  currentFileIndex,
  setFiles,
  setCurrentFileIndex,
  handleFilesAddedOriginal,
  resetTranscription,
  setNewsSegments,
  clearAllStorageState,
}: UseRadioActionsProps) => {
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleClearAll = useCallback(async () => {
    console.log('[RadioActions] handleClearAll: Starting clear sequence');
    try {
      // Reset state in this specific order for best results
      resetTranscription();
      console.log('[RadioActions] Transcription reset');
      
      setNewsSegments([]);
      console.log('[RadioActions] News segments cleared');
      
      // Clear files and reset index before storage to avoid rehydration issues
      setFiles([]);
      setCurrentFileIndex(0);
      console.log('[RadioActions] Files cleared');
      
      // Await storage clearing to make sure it completes
      await clearAllStorageState();
      console.log('[RadioActions] Storage state cleared');
      
      // Set a timeout to ensure UI has time to update
      setTimeout(() => {
        toast.success('Todos los datos han sido borrados');
      }, 100);
    } catch (error) {
      console.error('[RadioActions] Error during clear all:', error);
      toast.error('Error al borrar los datos almacenados.');
    } finally {
      // Mark last action as clear for any components that need to respond
      setLastAction('clear');
    }
  }, [resetTranscription, setNewsSegments, setFiles, setCurrentFileIndex, clearAllStorageState]);

  const handleTrackSelect = useCallback((index: number) => {
    if (index !== currentFileIndex) {
      console.log(`[RadioActions] Selecting track at index ${index}`);
      setCurrentFileIndex(index);
      setLastAction('track-select');
    }
  }, [currentFileIndex, setCurrentFileIndex]);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    if (newFiles.length === 0) return;
    
    console.log(`[RadioActions] Adding ${newFiles.length} files`);
    
    handleFilesAddedOriginal(newFiles); // Call the original function from useRadioFiles

    if (newFiles.length > 0) {
      toast.success(`${newFiles.length} archivos añadidos correctamente`);
      setLastAction('files-added');
    }
  }, [handleFilesAddedOriginal]);

  return {
    lastAction,
    handleClearAll,
    handleTrackSelect,
    handleFilesAdded, // Export the enhanced version
  };
};
