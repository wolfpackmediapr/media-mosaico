
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { UploadedFile } from '@/components/radio/types';

interface UseRadioActionsProps {
  files: UploadedFile[];
  currentFileIndex: number;
  setFiles: (files: UploadedFile[]) => void;
  setCurrentFileIndex: (index: number) => void;
  handleFilesAddedOriginal: (newFiles: File[]) => void; // Renamed to avoid conflict
  resetTranscription: () => void;
  setNewsSegments: React.Dispatch<React.SetStateAction<any[]>>; // Use specific type if available
  clearAllStorageState: () => Promise<boolean>; // Updated return type to Promise<boolean>
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
  const [isClearingState, setIsClearingState] = useState(false);

  const handleClearAll = useCallback(async () => {
    console.log('[RadioActions] handleClearAll: Starting clear sequence');
    
    if (isClearingState) {
      console.log('[RadioActions] Clear operation already in progress, ignoring');
      return;
    }
    
    try {
      setIsClearingState(true);
      
      // First reset the transcription state (text, utterances, etc)
      console.log('[RadioActions] Resetting transcription');
      resetTranscription();
      
      // Then clear the news segments
      console.log('[RadioActions] Clearing news segments');
      setNewsSegments([]);
      
      // Reset file state
      console.log('[RadioActions] Clearing file state');
      setFiles([]);
      setCurrentFileIndex(0);
      
      // Finally clear all storage state with persistence
      console.log('[RadioActions] Clearing persistent storage');
      const clearSuccess = await clearAllStorageState(); // Now awaiting the boolean result
      
      if (clearSuccess) {
        toast.success('Todos los datos han sido borrados');
        console.log('[RadioActions] All data successfully cleared');
      } else {
        console.warn('[RadioActions] Some storage items may not have been cleared');
        toast.success('Datos principales borrados'); // Still show success since UI state is cleared
      }
    } catch (error) {
      console.error('[RadioActions] Error during clear all:', error);
      toast.error('Error al borrar los datos almacenados.');
    } finally {
      setIsClearingState(false);
      setLastAction('clear');
    }
  }, [
    resetTranscription, 
    setNewsSegments, 
    setFiles, 
    setCurrentFileIndex, 
    clearAllStorageState, 
    isClearingState
  ]);

  const handleTrackSelect = useCallback((index: number) => {
    if (index !== currentFileIndex) {
      setCurrentFileIndex(index);
      // setPlaybackErrors(null); // Reset errors when changing tracks - handle via props if needed
      setLastAction('track-select');
    }
  }, [currentFileIndex, setCurrentFileIndex]);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    handleFilesAddedOriginal(newFiles); // Call the original function from useRadioFiles

    if (newFiles.length > 0) {
      toast.success(`${newFiles.length} archivos añadidos correctamente`);
      setLastAction('files-added');
      // setPlaybackErrors(null); // Reset errors when adding new files - handle via props if needed
    }
  }, [handleFilesAddedOriginal]);

  return {
    lastAction,
    handleClearAll,
    handleTrackSelect,
    handleFilesAdded, // Export the enhanced version
    isClearingState
  };
};
