
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
  setUploadedFiles?: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setNotepadContent?: React.Dispatch<React.SetStateAction<string>>;
  // New setters for comprehensive clearing
  setTranscriptionId?: React.Dispatch<React.SetStateAction<string | null>>;
  setTranscriptionMetadata?: React.Dispatch<React.SetStateAction<any>>;
  setTranscriptionResult?: React.Dispatch<React.SetStateAction<any>>;
  setAnalysisResults?: React.Dispatch<React.SetStateAction<string>>;
  setAssemblyId?: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useTvClearState = ({
  persistKey = "tv-files",
  onTextChange,
  files = [],
  setFiles,
  setNewsSegments,
  setTranscriptionText,
  resetTranscription,
  setUploadedFiles,
  setNotepadContent,
  setTranscriptionId,
  setTranscriptionMetadata,
  setTranscriptionResult,
  setAnalysisResults,
  setAssemblyId,
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
    setFiles: setFiles || setUploadedFiles,
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
      
      // Step 3: CRITICAL - Clear sessionStorage FIRST
      setClearingStage('Limpiando almacenamiento...');
      setClearProgress(50);
      
      clearStorage();
      
      // Clear new persisted state keys
      sessionStorage.removeItem('tv-transcription-text');
      sessionStorage.removeItem('tv-transcription-id');
      sessionStorage.removeItem('tv-transcription-result');
      sessionStorage.removeItem('tv-transcription-metadata');
      sessionStorage.removeItem('tv-news-segments');
      sessionStorage.removeItem('tv-analysis-results');
      
      // Clear video playback state
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('video-was-playing-') || 
            key.startsWith('video-position-') ||
            key.startsWith('chunked-video-was-playing-') ||
            key.startsWith('chunked-video-position-')) {
          sessionStorage.removeItem(key);
        }
      });
      
      console.log('[useTvClearState] sessionStorage cleared, waiting for persistence to settle');
      
      // Step 4: CRITICAL - Add microtask delay to let usePersistentState settle
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Step 5: NOW clear React state (after storage is cleared and settled)
      setClearingStage('Limpiando estado de React...');
      setClearProgress(60);
      
      if (setTranscriptionId) {
        setTranscriptionId(null);
        console.log('[useTvClearState] Cleared transcriptionId React state');
      }
      if (setTranscriptionMetadata) {
        setTranscriptionMetadata(undefined);
        console.log('[useTvClearState] Cleared transcriptionMetadata React state');
      }
      if (setTranscriptionResult) {
        setTranscriptionResult(null);
        console.log('[useTvClearState] Cleared transcriptionResult React state');
      }
      if (setAnalysisResults) {
        setAnalysisResults('');
        console.log('[useTvClearState] Cleared analysisResults React state');
      }
      if (setAssemblyId) {
        setAssemblyId(null);
        console.log('[useTvClearState] Cleared assemblyId React state');
      }
      
      // Step 6: Clear editor
      setClearingStage('Limpiando editor...');
      setClearProgress(70);
      
      if (editorResetFn) {
        try {
          editorResetFn();
          console.log('[useTvClearState] Editor reset complete');
        } catch (err) {
          console.error('[useTvClearState] Error during editor reset:', err);
        }
      }
      
      // Step 7: Clear analysis
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
      
      // Step 8: Clean up resources
      setClearingStage('Limpiando recursos...');
      setClearProgress(90);
      
      cleanupBlobUrls(filesToCleanup);
      
      // Clear notepad content if function provided
      if (setNotepadContent) {
        setNotepadContent('');
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
    clearUIState,
    clearTranscription,
    editorResetFn,
    clearAnalysisFn,
    cleanupBlobUrls,
    clearStorage,
    setLastAction,
    setNotepadContent,
    setTranscriptionId,
    setTranscriptionMetadata,
    setTranscriptionResult,
    setAnalysisResults,
    setAssemblyId
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
    clearAllTvState: handleClearAll, // Add expected property name
    handleEditorRegisterReset,
    setClearAnalysis,
    isClearing,
    clearingProgress: clearProgress,
    clearingStage,
    lastAction
  };
};
