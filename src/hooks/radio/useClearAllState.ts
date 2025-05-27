
import { useCallback, useState, useRef, useEffect } from 'react';
import { useSafeStorage } from '../use-safe-storage';

interface ClearAllStateOptions {
  transcriptionId?: string;
  persistKey?: string;
  onTextChange?: (text: string) => void;
}

interface ClearAllProgress {
  progress: number;
  stage: string;
  isClearing: boolean;
}

export const useClearAllState = ({
  transcriptionId,
  persistKey = "radio-files",
  onTextChange,
}: ClearAllStateOptions = {}) => {
  const [clearProgress, setClearProgress] = useState<ClearAllProgress>({
    progress: 0,
    stage: '',
    isClearing: false
  });
  
  const clearAnalysisRef = useRef<(() => void) | null>(null);
  const editorResetRef = useRef<null | (() => void)>(null);
  const mountedRef = useRef(true);
  
  const { 
    clearStorageKeys, 
    isClearing: storageClearing,
    getRemainingKeys 
  } = useSafeStorage({
    storage: 'sessionStorage',
    onError: (error) => {
      console.error('[useClearAllState] Storage error:', error);
    }
  });

  const updateProgress = useCallback((progress: number, stage: string) => {
    if (mountedRef.current) {
      setClearProgress(prev => ({
        ...prev,
        progress,
        stage,
        isClearing: progress > 0 && progress < 100
      }));
    }
  }, []);

  const handleEditorRegisterReset = useCallback((resetFn: () => void) => {
    editorResetRef.current = resetFn;
  }, []);

  const setClearAnalysis = useCallback((fn: () => void) => {
    clearAnalysisRef.current = fn;
  }, []);

  // Generate comprehensive list of keys to clear
  const getAllPossibleKeys = useCallback((baseKey: string, id?: string): string[] => {
    const keysToDelete = [
      `${baseKey}-metadata`,
      `${baseKey}-current-index`,
      `${baseKey}-text-content`,
      `${baseKey}-notepad`,
      "radio-transcription",
      "radio-transcription-draft",
      "radio-content-analysis-draft",
      "radio-content-analysis",
      "radio-transcription-speaker-draft",
      "transcription-timestamp-view-draft",
      "transcription-editor-mode-draft",
      "transcription-view-mode-draft",
      "radio-transcription-text-content"
    ];

    if (id) {
      keysToDelete.push(
        `radio-transcription-${id}`,
        `radio-transcription-speaker-${id}`,
        `transcription-timestamp-view-${id}`,
        `transcription-editor-mode-${id}`,
        `radio-content-analysis-${id}`,
        `radio-transcription-text-content-${id}`,
        `transcription-view-mode-${id}`
      );
    }

    return keysToDelete;
  }, []);

  // Enhanced clear function with comprehensive error handling
  const clearAllState = useCallback(async (): Promise<boolean> => {
    if (clearProgress.isClearing) {
      console.warn('[useClearAllState] Clear operation already in progress');
      return false;
    }

    console.log('[useClearAllState] Starting enhanced clear sequence');
    
    try {
      updateProgress(5, 'Iniciando limpieza');
      
      // Step 1: Reset handlers first
      updateProgress(15, 'Reiniciando componentes');
      
      let handlersSuccess = true;
      
      if (editorResetRef.current) {
        try {
          editorResetRef.current();
          console.log('[useClearAllState] Editor reset completed');
        } catch (error) {
          console.error('[useClearAllState] Editor reset failed:', error);
          handlersSuccess = false;
        }
      }
      
      if (clearAnalysisRef.current) {
        try {
          clearAnalysisRef.current();
          console.log('[useClearAllState] Analysis reset completed');
        } catch (error) {
          console.error('[useClearAllState] Analysis reset failed:', error);
          handlersSuccess = false;
        }
      }
      
      // Step 2: Clear text content
      updateProgress(30, 'Limpiando contenido');
      
      if (onTextChange) {
        try {
          onTextChange("");
          console.log('[useClearAllState] Text content cleared');
        } catch (error) {
          console.error('[useClearAllState] Text change callback failed:', error);
          handlersSuccess = false;
        }
      }
      
      // Step 3: Clear storage with retry logic
      updateProgress(50, 'Limpiando almacenamiento');
      
      const keysToDelete = getAllPossibleKeys(persistKey, transcriptionId);
      let storageSuccess = await clearStorageKeys(keysToDelete);
      
      // Retry failed keys once
      if (!storageSuccess) {
        updateProgress(65, 'Reintentando limpieza');
        console.log('[useClearAllState] Retrying storage clear');
        
        const remainingKeys = getRemainingKeys(persistKey);
        if (remainingKeys.length > 0) {
          storageSuccess = await clearStorageKeys(remainingKeys);
        } else {
          storageSuccess = true; // No keys remaining
        }
      }
      
      // Step 4: Final validation
      updateProgress(80, 'Validando limpieza');
      
      const finalCheck = getRemainingKeys(persistKey);
      const isCompletelyCleared = finalCheck.length === 0;
      
      if (!isCompletelyCleared) {
        console.warn(`[useClearAllState] ${finalCheck.length} keys remain after clearing`);
      }
      
      updateProgress(100, 'Completado');
      
      // Reset progress after a short delay
      setTimeout(() => {
        if (mountedRef.current) {
          setClearProgress({
            progress: 0,
            stage: '',
            isClearing: false
          });
        }
      }, 1000);
      
      const overallSuccess = handlersSuccess && storageSuccess && isCompletelyCleared;
      console.log('[useClearAllState] Clear sequence completed:', {
        handlersSuccess,
        storageSuccess,
        isCompletelyCleared,
        overallSuccess
      });
      
      return overallSuccess;
      
    } catch (error) {
      console.error('[useClearAllState] Critical error during clear operation:', error);
      updateProgress(0, 'Error en limpieza');
      
      setTimeout(() => {
        if (mountedRef.current) {
          setClearProgress({
            progress: 0,
            stage: '',
            isClearing: false
          });
        }
      }, 2000);
      
      return false;
    }
  }, [clearProgress.isClearing, updateProgress, onTextChange, getAllPossibleKeys, persistKey, transcriptionId, clearStorageKeys, getRemainingKeys]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    clearAllState,
    handleEditorRegisterReset,
    setClearAnalysis,
    clearProgress: clearProgress.progress,
    clearingStage: clearProgress.stage,
    isClearing: clearProgress.isClearing || storageClearing
  };
};
