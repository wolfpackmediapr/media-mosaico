
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
      resetTranscription();
      setNewsSegments([]);
      setFiles([]);
      setCurrentFileIndex(0);
      // Assuming clearAllStorageState handles storage keys and potentially editor/analysis reset
      await clearAllStorageState(); // Await the void promise
      toast.success('Todos los datos han sido borrados'); // Assume success if no error
    } catch (error) {
      console.error('[RadioActions] Error during clear all:', error);
      toast.error('Error al borrar los datos almacenados.'); // Show error toast on failure
    } finally {
      // setPlaybackErrors(null); // This needs to be handled via props if needed
      setLastAction('clear');
    }
  }, [resetTranscription, setNewsSegments, setFiles, setCurrentFileIndex, clearAllStorageState]);

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
  };
};
