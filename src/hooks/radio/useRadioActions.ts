import { useCallback, useState } from 'react';
import { UploadedFile } from '@/components/radio/types';
import { RadioNewsSegment } from '@/components/radio/RadioNewsSegmentsContainer';

interface UseRadioActionsProps {
  files: UploadedFile[];
  currentFileIndex: number;
  setFiles: (files: UploadedFile[]) => void;
  setCurrentFileIndex: (index: number) => void;
  handleFilesAddedOriginal: (newFiles: File[]) => void;
  resetTranscription?: () => void;
  setNewsSegments?: React.Dispatch<React.SetStateAction<RadioNewsSegment[]>>;
  clearAllStorageState?: () => Promise<boolean>;
}

export const useRadioActions = ({
  files,
  currentFileIndex,
  setFiles,
  setCurrentFileIndex,
  handleFilesAddedOriginal,
  resetTranscription,
  setNewsSegments,
  clearAllStorageState
}: UseRadioActionsProps) => {
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Update the return type to match what's expected by the RadioContainerState interface
  const handleClearAll = useCallback(async (): Promise<void> => {
    console.log('[useRadioActions] Handling clear all request');
    setLastAction('clear');

    // Clear storage first
    if (clearAllStorageState) {
      try {
        await clearAllStorageState();
      } catch (error) {
        console.error('[useRadioActions] Error clearing storage state:', error);
      }
    }

    // Reset transcription state if available
    if (resetTranscription) {
      try {
        resetTranscription();
      } catch (error) {
        console.error('[useRadioActions] Error resetting transcription:', error);
      }
    }

    // Clear news segments if available
    if (setNewsSegments) {
      try {
        setNewsSegments([]);
      } catch (error) {
        console.error('[useRadioActions] Error clearing news segments:', error);
      }
    }

    // Reset files and current index
    try {
      setCurrentFileIndex(-1);
      setFiles([]);
    } catch (error) {
      console.error('[useRadioActions] Error clearing files state:', error);
    }

    // No return value (void)
  }, [clearAllStorageState, resetTranscription, setNewsSegments, setFiles, setCurrentFileIndex]);

  const handleTrackSelect = useCallback((index: number) => {
    if (index >= 0 && index < files.length && index !== currentFileIndex) {
      console.log(`[useRadioActions] Selecting track at index: ${index}`);
      setLastAction('select');
      setCurrentFileIndex(index);
    }
  }, [files, currentFileIndex, setCurrentFileIndex]);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    console.log(`[useRadioActions] Adding ${newFiles.length} new files`);
    setLastAction('add');
    handleFilesAddedOriginal(newFiles);
  }, [handleFilesAddedOriginal]);

  return {
    lastAction,
    handleClearAll,
    handleTrackSelect,
    handleFilesAdded
  };
};
