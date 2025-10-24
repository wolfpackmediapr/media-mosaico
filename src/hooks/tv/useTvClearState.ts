
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
  // Remove functions from usePersistentState (prevents re-write)
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
      
      // Clear video playback state and editor-related keys
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        // Clear video playback state
        if (key.startsWith('video-was-playing-') || 
            key.startsWith('video-position-') ||
            key.startsWith('chunked-video-was-playing-') ||
            key.startsWith('chunked-video-position-')) {
          sessionStorage.removeItem(key);
        }
        
        // Clear editor state keys (speaker text and edit mode)
        if (key.startsWith('radio-transcription-speaker-') ||
            key.startsWith('transcription-editor-mode-')) {
          sessionStorage.removeItem(key);
          console.log(`[useTvClearState] Cleared editor key: ${key}`);
        }
        
        // Clear TV view mode keys
        if (key.startsWith('tv-transcription-view-mode-')) {
          sessionStorage.removeItem(key);
          console.log(`[useTvClearState] Cleared view mode key: ${key}`);
        }
      });
      
      console.log('[useTvClearState] sessionStorage cleared, waiting for persistence to settle');
      
      // Step 4: CRITICAL - Increase delay to allow usePersistentState to fully settle
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Step 5: NOW clear React state using removeItem functions (prevents re-write)
      setClearingStage('Limpiando estado de React...');
      setClearProgress(60);
      
      // Use removeItem functions instead of setState to prevent usePersistentState from re-writing
      if (removeTranscriptionId) {
        removeTranscriptionId();
        console.log('[useTvClearState] Removed transcriptionId via removeItem');
      }
      if (removeTranscriptionMetadata) {
        removeTranscriptionMetadata();
        console.log('[useTvClearState] Removed transcriptionMetadata via removeItem');
      }
      if (removeTranscriptionResult) {
        removeTranscriptionResult();
        console.log('[useTvClearState] Removed transcriptionResult via removeItem');
      }
      if (removeAnalysisResults) {
        removeAnalysisResults();
        console.log('[useTvClearState] Removed analysisResults via removeItem');
      }
      if (removeTranscriptionText) {
        removeTranscriptionText();
        console.log('[useTvClearState] Removed transcriptionText via removeItem');
      }
      if (removeNewsSegments) {
        removeNewsSegments();
        console.log('[useTvClearState] Removed newsSegments via removeItem');
      }
      if (removeActiveProcessingId) {
        removeActiveProcessingId();
        console.log('[useTvClearState] Removed activeProcessingId via removeItem');
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
      setClearProgress(85);
      
      cleanupBlobUrls(filesToCleanup);
      
      // Clear notepad content if function provided
      if (setNotepadContent) {
        setNotepadContent('');
      }
      
      // Step 9: Validate clearing (like Radio)
      setClearingStage('Validando limpieza...');
      setClearProgress(95);
      
      const keysToCheck = [
        'tv-transcription-text',
        'tv-transcription-id',
        'tv-transcription-result',
        'tv-transcription-metadata',
        'tv-analysis-results',
        'tv-news-segments'
      ];
      
      // Check fixed keys
      const remainingKeys = keysToCheck.filter(key => 
        sessionStorage.getItem(key) !== null
      );
      
      // Check pattern-based keys (editor-related)
      const allKeys = Object.keys(sessionStorage);
      const editorKeys = allKeys.filter(key => 
        key.startsWith('radio-transcription-speaker-') ||
        key.startsWith('transcription-editor-mode-') ||
        key.startsWith('tv-transcription-view-mode-')
      );
      
      if (remainingKeys.length > 0 || editorKeys.length > 0) {
        console.warn('[useTvClearState] Keys still present after clear:', {
          fixed: remainingKeys,
          editor: editorKeys
        });
        
        // Force-remove remaining keys
        [...remainingKeys, ...editorKeys].forEach(key => {
          sessionStorage.removeItem(key);
          console.log(`[useTvClearState] Force-removed remaining key: ${key}`);
        });
      } else {
        console.log('[useTvClearState] Validation passed - all keys cleared');
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
