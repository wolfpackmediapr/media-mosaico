import { useCallback, useState, useRef, useEffect } from 'react';
import { usePersistentState } from '@/hooks/use-persistent-state';

interface UploadedFile extends File {
  preview?: string;
}

interface UseTvClearStateOptions {
  persistKey?: string;
  onTextChange?: (text: string) => void;
  files?: UploadedFile[];
  setFiles?: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setNewsSegments?: React.Dispatch<React.SetStateAction<any[]>>;
  setTranscriptionText?: React.Dispatch<React.SetStateAction<string>>;
  resetTranscription?: () => void;
}

export const useTvClearState = ({
  persistKey = "tv-files",
  onTextChange,
  files = [],
  setFiles,
  setNewsSegments,
  setTranscriptionText,
  resetTranscription,
}: UseTvClearStateOptions = {}) => {
  const [isClearing, setIsClearing] = useState(false);
  const [clearProgress, setClearProgress] = useState(0);
  const [clearingStage, setClearingStage] = useState('');
  const cancelTokenRef = useRef<boolean>(false);
  const mountedRef = useRef(true);
  const [editorResetFn, setEditorResetFn] = useState<(() => void) | null>(null);
  const [clearAnalysisFn, setClearAnalysisFn] = useState<(() => void) | null>(null);
  
  // State to track last action
  const [lastAction, setLastAction] = usePersistentState<string | null>(
    `${persistKey}-last-action`,
    null,
    { storage: 'sessionStorage' }
  );

  // Clean up blob URLs to prevent memory leaks
  const cleanupBlobUrls = useCallback((filesToCleanup: UploadedFile[]): void => {
    if (!filesToCleanup || filesToCleanup.length === 0) return;
    
    console.log(`[useTvClearState] Cleaning up ${filesToCleanup.length} blob URLs`);
    
    filesToCleanup.forEach(file => {
      if (file && 'preview' in file && file.preview && typeof file.preview === 'string') {
        try {
          URL.revokeObjectURL(file.preview);
          console.log(`[useTvClearState] Revoked blob URL: ${file.preview}`);
        } catch (e) {
          console.error(`[useTvClearState] Failed to revoke blob URL:`, e);
        }
      }
    });
  }, []);

  // Enhanced clear all function
  const handleClearAll = useCallback(async (): Promise<boolean> => {
    if (isClearing) {
      console.warn('[useTvClearState] Clear operation already in progress');
      return false;
    }
    
    console.log('[useTvClearState] Starting comprehensive clear sequence');
    setIsClearing(true);
    setClearProgress(0);
    setClearingStage('Iniciando limpieza...');
    cancelTokenRef.current = false;
    
    try {
      // Step 1: Clear UI components first
      setClearingStage('Limpiando archivos de video...');
      setClearProgress(20);
      
      const filesToCleanup = [...files];
      
      // Reset UI state immediately for better UX
      if (setTranscriptionText) {
        setTranscriptionText('');
      }
      
      if (setNewsSegments) {
        setNewsSegments([]);
      }
      
      if (setFiles) {
        setFiles([]);
      }
      
      setClearingStage('Limpiando transcripción...');
      setClearProgress(40);
      
      // Step 2: Call reset functions
      if (resetTranscription) {
        try {
          resetTranscription();
          console.log('[useTvClearState] Transcription reset complete');
        } catch (err) {
          console.error('[useTvClearState] Error during resetTranscription:', err);
        }
      }
      
      // Step 3: Clear editor
      setClearingStage('Limpiando editor...');
      setClearProgress(60);
      
      if (editorResetFn) {
        try {
          editorResetFn();
          console.log('[useTvClearState] Editor reset complete');
        } catch (err) {
          console.error('[useTvClearState] Error during editor reset:', err);
        }
      }
      
      // Step 4: Clear analysis
      setClearingStage('Limpiando análisis...');
      setClearProgress(80);
      
      if (clearAnalysisFn) {
        try {
          clearAnalysisFn();
          console.log('[useTvClearState] Analysis reset complete');
        } catch (err) {
          console.error('[useTvClearState] Error during analysis reset:', err);
        }
      }
      
      // Step 5: Clean up resources
      setClearingStage('Limpiando recursos...');
      setClearProgress(90);
      
      cleanupBlobUrls(filesToCleanup);
      
      // Step 6: Clear storage
      setClearingStage('Finalizando...');
      setClearProgress(95);
      
      try {
        // Clear persistent state
        sessionStorage.removeItem(persistKey);
        sessionStorage.removeItem(`${persistKey}-transcription`);
        sessionStorage.removeItem(`${persistKey}-notepad`);
        
        if (onTextChange) {
          onTextChange('');
        }
      } catch (err) {
        console.error('[useTvClearState] Error clearing storage:', err);
      }
      
      // Mark as clear action
      setLastAction('clear');
      
      setClearProgress(100);
      setClearingStage('Completado');
      
      console.log('[useTvClearState] Clear sequence completed successfully');
      return true;
      
    } catch (error) {
      console.error('[useTvClearState] Critical error during clear operation:', error);
      return false;
    } finally {
      setTimeout(() => {
        if (mountedRef.current) {
          setIsClearing(false);
          setClearProgress(0);
          setClearingStage('');
        }
      }, 500);
    }
  }, [
    isClearing,
    files,
    setTranscriptionText,
    setNewsSegments,
    setFiles,
    resetTranscription,
    editorResetFn,
    clearAnalysisFn,
    cleanupBlobUrls,
    persistKey,
    onTextChange,
    setLastAction
  ]);

  const handleEditorRegisterReset = useCallback((resetFn: () => void) => {
    setEditorResetFn(() => resetFn);
  }, []);

  const setClearAnalysis = useCallback((clearFn: () => void) => {
    setClearAnalysisFn(() => clearFn);
  }, []);
  
  // Keep track of mounted state for cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cancelTokenRef.current = true;
    };
  }, []);

  return {
    handleClearAll,
    handleEditorRegisterReset,
    setClearAnalysis,
    isClearing,
    clearingProgress: clearProgress,
    clearingStage,
    lastAction
  };
};
