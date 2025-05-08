
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { UploadedFile } from '@/components/radio/types';

interface UseRadioActionsProps {
  files: UploadedFile[];
  currentFileIndex: number;
  setFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  setCurrentFileIndex: (index: number) => void;
  handleFilesAddedOriginal: (newFiles: File[]) => void;
  resetTranscription: () => void;
  setNewsSegments: React.Dispatch<React.SetStateAction<any[]>>;
  clearAllStorageState: () => Promise<void>; // Updated to match Promise<void>
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
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);

  const handleClearAll = useCallback(async () => {
    if (isClearingAll) return; // Prevent multiple clicks
    
    setIsClearingAll(true);
    console.log('[RadioActions] handleClearAll: Starting clear sequence');
    
    try {
      // Show toast first so user knows action is processing
      toast.loading('Borrando datos...', { id: 'clear-all-toast' });
      
      // First reset state that doesn't depend on storage
      setNewsSegments([]);
      console.log('[RadioActions] News segments cleared');
      
      // Reset transcription (may involve UI updates)
      await new Promise(resolve => {
        setTimeout(() => {
          resetTranscription();
          console.log('[RadioActions] Transcription reset');
          resolve(true);
        }, 0);
      });
      
      // Clear files and reset index before storage to avoid rehydration issues
      // Use separate microtasks to avoid UI freeze
      await new Promise(resolve => {
        setTimeout(() => {
          // Revoke any object URLs to prevent memory leaks
          files.forEach(file => {
            if (file.preview) {
              URL.revokeObjectURL(file.preview);
            }
          });
          setFiles([]);
          setCurrentFileIndex(0);
          console.log('[RadioActions] Files cleared');
          resolve(true);
        }, 0);
      });
      
      // Finally clear storage state with another microtask
      await new Promise(resolve => {
        setTimeout(async () => {
          await clearAllStorageState();
          console.log('[RadioActions] Storage state cleared');
          resolve(true);
        }, 0);
      });
      
      // Update toast on success
      toast.success('Todos los datos han sido borrados', { id: 'clear-all-toast' });
    } catch (error) {
      console.error('[RadioActions] Error during clear all:', error);
      toast.error('Error al borrar los datos almacenados.', { id: 'clear-all-toast' });
    } finally {
      // Mark last action as clear for any components that need to respond
      setLastAction('clear');
      setIsClearingAll(false);
    }
  }, [
    isClearingAll,
    resetTranscription, 
    setNewsSegments, 
    setFiles, 
    setCurrentFileIndex, 
    clearAllStorageState,
    files
  ]);

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
    isClearingAll
  };
};
