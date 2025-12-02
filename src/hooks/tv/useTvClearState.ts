
import { useCallback, useState, useRef, useEffect } from 'react';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { useTvClearOperations } from './clear/useTvClearOperations';
import { useSafeStorage } from '@/hooks/use-safe-storage';

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
  // Remove functions from usePersistentState (prevents re-write race condition)
  removeTranscriptionText?: () => void;
  removeTranscriptionMetadata?: () => void;
  removeTranscriptionResult?: () => void;
  removeTranscriptionId?: () => void;
  removeNewsSegments?: () => void;
  removeAnalysisResults?: () => void;
  removeActiveProcessingId?: () => void;
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
  removeTranscriptionText,
  removeTranscriptionMetadata,
  removeTranscriptionResult,
  removeTranscriptionId,
  removeNewsSegments,
  removeAnalysisResults,
  removeActiveProcessingId,
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
  
  // HYBRID FIX: Use useSafeStorage for reliable clearing (like Radio)
  const { clearStorageKeys } = useSafeStorage({
    storage: 'sessionStorage',
    onError: (error) => console.error('[useTvClearState] Safe storage error:', error)
  });

  // Enhanced clear all function with race condition fix
  const handleClearAll = useCallback(async (): Promise<boolean> => {
    if (isClearing) {
      console.warn('[useTvClearState] Clear operation already in progress');
      return false;
    }
    
    console.log('[useTvClearState] Starting comprehensive clear sequence (hybrid fix)');
    setIsClearing(true);
    setClearProgress(0);
    setClearingStage('Iniciando limpieza...');
    cancelTokenRef.current = false;
    
    try {
      // Step 1: CRITICAL - Call removeItem functions FIRST (sets skipNextWriteRef flag)
      // This prevents usePersistentState useEffect from re-writing cleared values
      setClearingStage('Limpiando estado persistente...');
      setClearProgress(20);
      
      if (removeTranscriptionText) {
        removeTranscriptionText();
        console.log('[useTvClearState] Removed transcriptionText via removeItem');
      }
      if (removeTranscriptionId) {
        removeTranscriptionId();
        console.log('[useTvClearState] Removed transcriptionId via removeItem');
      }
      if (removeAnalysisResults) {
        removeAnalysisResults();
        console.log('[useTvClearState] Removed analysisResults via removeItem');
      }
      if (removeActiveProcessingId) {
        removeActiveProcessingId();
        console.log('[useTvClearState] Removed activeProcessingId via removeItem');
      }
      
      // These are now plain useState, just call the remove functions
      if (removeTranscriptionMetadata) {
        removeTranscriptionMetadata();
        console.log('[useTvClearState] Cleared transcriptionMetadata (useState)');
      }
      if (removeTranscriptionResult) {
        removeTranscriptionResult();
        console.log('[useTvClearState] Cleared transcriptionResult (useState)');
      }
      if (removeNewsSegments) {
        removeNewsSegments();
        console.log('[useTvClearState] Cleared newsSegments (useState)');
      }
      
      // Step 2: Clear UI components
      setClearingStage('Limpiando archivos de video...');
      setClearProgress(40);
      
      const filesToCleanup = clearUIState();
      clearTranscription();
      
      // Step 3: Use useSafeStorage for reliable sessionStorage clearing
      setClearingStage('Limpiando almacenamiento...');
      setClearProgress(50);
      
      clearStorage();
      
      // Collect all keys to clear
      const keysToDelete = [
        'tv-transcription-text',
        'tv-transcription-id',
        'tv-analysis-results',
        'tv-active-processing-id'
      ];
      
      // Add pattern-based keys
      const allKeys = Object.keys(sessionStorage);
      allKeys.forEach(key => {
        if (key.startsWith('video-was-playing-') || 
            key.startsWith('video-position-') ||
            key.startsWith('chunked-video-was-playing-') ||
            key.startsWith('chunked-video-position-') ||
            key.startsWith('radio-transcription-speaker-') ||
            key.startsWith('transcription-editor-mode-') ||
            key.startsWith('tv-transcription-view-mode-')) {
          keysToDelete.push(key);
        }
      });
      
      // Use safe storage to clear with retry logic
      await clearStorageKeys(keysToDelete);
      console.log('[useTvClearState] Cleared storage keys via useSafeStorage');
      
      // Step 4: Clear editor
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
      
      // Step 5: Clear analysis
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
      
      // Step 6: Clean up resources
      setClearingStage('Limpiando recursos...');
      setClearProgress(85);
      
      cleanupBlobUrls(filesToCleanup);
      
      if (setNotepadContent) {
        setNotepadContent('');
      }
      
      // Step 7: Validate clearing
      setClearingStage('Validando limpieza...');
      setClearProgress(95);
      
      const keysToCheck = [
        'tv-transcription-text',
        'tv-transcription-id',
        'tv-analysis-results',
        'tv-active-processing-id'
      ];
      
      const remainingKeys = keysToCheck.filter(key => 
        sessionStorage.getItem(key) !== null
      );
      
      if (remainingKeys.length > 0) {
        console.warn('[useTvClearState] Keys still present after clear:', remainingKeys);
        // Force-remove with retry
        await clearStorageKeys(remainingKeys);
      } else {
        console.log('[useTvClearState] Validation passed - all keys cleared');
      }
      
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
    clearStorageKeys,
    setLastAction,
    setNotepadContent,
    removeTranscriptionText,
    removeTranscriptionId,
    removeAnalysisResults,
    removeActiveProcessingId,
    removeTranscriptionMetadata,
    removeTranscriptionResult,
    removeNewsSegments
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
