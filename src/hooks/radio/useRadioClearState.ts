import { useCallback, useState } from 'react';
import { useSafeStorage } from '../use-safe-storage';
import { useClearRadioState } from './useClearRadioState';

interface UseRadioClearStateOptions {
  transcriptionId?: string;
  persistKey?: string;
  onTextChange?: (text: string) => void;
  files?: File[];
  setFiles?: React.Dispatch<React.SetStateAction<File[]>>;
  setNewsSegments?: React.Dispatch<React.SetStateAction<any[]>>;
  setTranscriptionText?: React.Dispatch<React.SetStateAction<string>>;
}

export const useRadioClearState = ({
  transcriptionId,
  persistKey = "radio-files",
  onTextChange,
  files = [],
  setFiles,
  setNewsSegments,
  setTranscriptionText
}: UseRadioClearStateOptions = {}) => {
  const [clearingProgress, setClearingProgress] = useState(0);
  const [clearingStage, setClearingStage] = useState<string>('');
  
  // Use the base clear state hook
  const {
    clearAllState,
    handleEditorRegisterReset,
    setClearAnalysis,
    isClearing
  } = useClearRadioState({
    transcriptionId,
    persistKey,
    onTextChange
  });

  // Enhanced clear all function with progress reporting
  const handleClearAll = useCallback(async () => {
    if (isClearing) return;
    
    console.log('[RadioClearState] handleClearAll: Starting clear sequence');
    
    setClearingProgress(5);
    setClearingStage('Iniciando limpieza');
    
    // Clear UI state first (fast)
    setClearingProgress(10);
    setClearingStage('Limpiando interfaz');
    
    // Clear news segments
    if (setNewsSegments) {
      setNewsSegments([]);
      console.log('[RadioClearState] News segments cleared');
    }
    setClearingProgress(20);
    
    // Reset transcription text
    setClearingStage('Reiniciando transcripción');
    if (setTranscriptionText) {
      setTranscriptionText('');
    }
    if (onTextChange) {
      onTextChange('');
    }
    console.log('[RadioClearState] Transcription reset');
    setClearingProgress(40);
    
    // Reset files
    setClearingStage('Limpiando archivos');
    if (setFiles) {
      // Keep reference to files for cleanup
      const filesToCleanup = [...files];
      
      // Clear files from state
      setFiles([]);
      
      // Clean up blob URLs
      filesToCleanup.forEach(file => {
        if ('preview' in file && file.preview && typeof file.preview === 'string') {
          try {
            URL.revokeObjectURL(file.preview);
          } catch (e) {
            // Ignore revocation errors
          }
        }
      });
    }
    setClearingProgress(60);
    
    // Now clear persisted state (slower)
    setClearingStage('Limpiando almacenamiento');
    
    try {
      // Run the storage clear operation
      await clearAllState();
      console.log('[RadioClearState] Storage cleared');
      setClearingProgress(100);
      setClearingStage('Completado');
      
      // Wait a bit before resetting progress indicators
      setTimeout(() => {
        setClearingProgress(0);
        setClearingStage('');
      }, 500);
      
      return true;
    } catch (error) {
      console.error('[RadioClearState] Error clearing state:', error);
      setClearingProgress(0);
      setClearingStage('Error');
      return false;
    }
  }, [
    isClearing, 
    clearAllState, 
    setNewsSegments, 
    setTranscriptionText, 
    onTextChange, 
    setFiles, 
    files
  ]);
  
  return {
    handleClearAll,
    handleEditorRegisterReset,
    setClearAnalysis,
    isClearing,
    clearingProgress,
    clearingStage
  };
};
