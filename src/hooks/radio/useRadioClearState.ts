
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { RadioNewsSegment } from '@/components/radio/RadioNewsSegmentsContainer';
import { UploadedFile } from '@/components/radio/types';
import { useResourceManager } from '@/utils/resourceCleanup';

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
  const [clearProgress, setClearProgress] = useState<number>(0);
  const resourceManager = useResourceManager();
  
  // Enhanced clear all state handler with progress tracking
  const handleClearAll = useCallback(async (): Promise<void> => {
    if (isClearingAll) return Promise.resolve(); // Prevent multiple clicks
    
    setIsClearingAll(true);
    setClearProgress(0);
    console.log('[RadioClearState] handleClearAll: Starting clear sequence');
    
    try {
      // Show toast first so user knows action is processing
      toast.loading('Borrando datos...', { id: 'clear-all-toast' });
      
      // First reset state that doesn't depend on storage - with proper yielding
      setClearProgress(10);
      setNewsSegments([]);
      console.log('[RadioClearState] News segments cleared');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      setClearProgress(20);
      
      // Reset transcription (may involve UI updates)
      resetTranscription();
      console.log('[RadioClearState] Transcription reset');
      
      // Give browser time to process UI updates
      await new Promise(resolve => setTimeout(resolve, 100));
      setClearProgress(40);
      
      // Clean up file resources and reset files state
      await new Promise<void>(resolve => {
        setTimeout(() => {
          // Revoke any object URLs to prevent memory leaks - in batches
          const urlBatchSize = 2;
          for (let i = 0; i < files.length; i += urlBatchSize) {
            const batch = files.slice(i, i + urlBatchSize);
            batch.forEach(file => {
              if (file.preview && file.preview.startsWith('blob:')) {
                try {
                  URL.revokeObjectURL(file.preview);
                } catch (error) {
                  console.error('[RadioClearState] Error revoking URL:', error);
                }
              }
            });
            
            // Small delay between batches to prevent UI freeze
            if (i + urlBatchSize < files.length) {
              setTimeout(() => {}, 10);
            }
          }
          
          setFiles([]);
          setCurrentFileIndex(0);
          console.log('[RadioClearState] Files cleared');
          resolve();
        }, 50);
      });
      
      setClearProgress(60);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Finally clear storage state with another yield
      try {
        await clearAllStorageState();
        console.log('[RadioClearState] Storage state cleared');
      } catch (error) {
        console.error('[RadioClearState] Error clearing storage state:', error);
        toast.error('Error al borrar datos almacenados', { id: 'clear-all-toast' });
        return Promise.reject(error);
      }
      
      setClearProgress(100);
      
      // Update toast on success
      toast.success('Todos los datos han sido borrados', { id: 'clear-all-toast' });
      
      return Promise.resolve();
    } catch (error) {
      console.error('[RadioClearState] Error during clear all:', error);
      toast.error('Error al borrar los datos almacenados.', { id: 'clear-all-toast' });
      return Promise.reject(error);
    } finally {
      // Use longer timeout to ensure UI has time to recover before allowing another clear
      setTimeout(() => {
        setIsClearingAll(false);
        setClearProgress(0);
      }, 500);
    }
  }, [
    isClearingAll,
    resetTranscription, 
    setNewsSegments, 
    setFiles, 
    setCurrentFileIndex, 
    clearAllStorageState,
    files,
    resourceManager
  ]);

  return {
    handleClearAll,
    isClearingAll,
    clearProgress
  };
};
