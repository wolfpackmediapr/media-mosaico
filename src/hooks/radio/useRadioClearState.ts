
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { RadioNewsSegment } from '@/components/radio/RadioNewsSegmentsContainer';
import { UploadedFile } from '@/components/radio/types';

interface UseRadioClearStateProps {
  files: UploadedFile[];
  resetTranscription: () => void;
  setNewsSegments: React.Dispatch<React.SetStateAction<RadioNewsSegment[]>>;
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setCurrentFileIndex: (index: number) => void;
  clearAllStorageState: () => Promise<void>;
  transcriptionId?: string;
  persistKey?: string;
  onTextChange?: (text: string) => void;
}

export const useRadioClearState = ({
  files,
  resetTranscription,
  setNewsSegments,
  setFiles,
  setCurrentFileIndex,
  clearAllStorageState,
  transcriptionId,
  persistKey = "radio-files",
  onTextChange,
}: UseRadioClearStateProps) => {
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);

  // Enhanced clear all state handler that returns Promise<void>
  const handleClearAll = useCallback(async (): Promise<void> => {
    if (isClearingAll) return Promise.resolve(); // Prevent multiple clicks
    
    setIsClearingAll(true);
    console.log('[RadioClearState] handleClearAll: Starting clear sequence');
    
    try {
      // Show toast first so user knows action is processing
      toast.loading('Borrando datos...', { id: 'clear-all-toast' });
      
      // First reset state that doesn't depend on storage
      setNewsSegments([]);
      console.log('[RadioClearState] News segments cleared');
      
      // Reset transcription (may involve UI updates)
      await new Promise<void>(resolve => {
        setTimeout(() => {
          resetTranscription();
          console.log('[RadioClearState] Transcription reset');
          resolve();
        }, 0);
      });
      
      // Clear files and reset index before storage to avoid rehydration issues
      // Use separate microtasks to avoid UI freeze
      await new Promise<void>(resolve => {
        setTimeout(() => {
          // Revoke any object URLs to prevent memory leaks
          files.forEach(file => {
            if (file.preview && file.preview.startsWith('blob:')) {
              URL.revokeObjectURL(file.preview);
            }
          });
          setFiles([]);
          setCurrentFileIndex(0);
          console.log('[RadioClearState] Files cleared');
          resolve();
        }, 0);
      });
      
      // Finally clear storage state with another microtask
      await new Promise<void>(resolve => {
        setTimeout(async () => {
          await clearAllStorageState();
          console.log('[RadioClearState] Storage state cleared');
          resolve();
        }, 0);
      });
      
      // Update toast on success
      toast.success('Todos los datos han sido borrados', { id: 'clear-all-toast' });
      
      return Promise.resolve(); // Explicitly return a resolved promise
    } catch (error) {
      console.error('[RadioClearState] Error during clear all:', error);
      toast.error('Error al borrar los datos almacenados.', { id: 'clear-all-toast' });
      return Promise.reject(error); // Explicitly return a rejected promise on error
    } finally {
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

  return {
    handleClearAll,
    isClearingAll
  };
};
