import { useCallback, useState, useRef, useEffect } from 'react';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { useTvClearOperations } from './clear/useTvClearOperations';

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

  // Clear operations hook
  const { cleanupBlobUrls, clearUIState, clearTranscription, clearStorage } = useTvClearOperations({
    files,
    setFiles,
    setNewsSegments,
    setTranscriptionText,
    resetTranscription,
    onTextChange,
    persistKey
  });

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
      
      const filesToCleanup = clearUIState();
      
      setClearingStage('Limpiando transcripción...');
      setClearProgress(40);
      
      // Step 2: Clear transcription
      clearTranscription();
      
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
      
      clearStorage();
      
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
    clearUIState,
    clearTranscription,
    editorResetFn,
    clearAnalysisFn,
    cleanupBlobUrls,
    clearStorage,
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
