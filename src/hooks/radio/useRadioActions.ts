
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { UploadedFile } from '@/components/radio/types';
import { useRadioClearState } from './useRadioClearState';

interface UseRadioActionsProps {
  files: UploadedFile[];
  currentFileIndex: number;
  setFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  setCurrentFileIndex: (index: number) => void;
  handleFilesAddedOriginal: (newFiles: File[]) => void;
  resetTranscription: () => void;
  setNewsSegments: React.Dispatch<React.SetStateAction<any[]>>;
  clearAllStorageState: () => Promise<void>;
  transcriptionId?: string;
  persistKey?: string;
  onTextChange?: (text: string) => void;
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
  transcriptionId,
  persistKey = "radio-files",
  onTextChange
}: UseRadioActionsProps) => {
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Use our extracted clear state hook
  const { handleClearAll, isClearingAll, clearProgress } = useRadioClearState({
    files,
    resetTranscription,
    setNewsSegments,
    setFiles,
    setCurrentFileIndex,
    clearAllStorageState,
    transcriptionId,
    persistKey,
    onTextChange
  });

  // Mark the last action as clear after clear operation completes
  const handleClearAllWithTracking = useCallback(async (): Promise<void> => {
    try {
      await handleClearAll();
      setLastAction('clear');
    } catch (error) {
      console.error('[RadioActions] Error during clear tracking:', error);
    }
    return Promise.resolve();
  }, [handleClearAll]);

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
    handleClearAll: handleClearAllWithTracking,
    handleTrackSelect,
    handleFilesAdded, // Export the enhanced version
    isClearingAll,
    clearProgress
  };
};
