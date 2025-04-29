
import { useEffect, useRef, useCallback } from 'react';

interface ClearRadioStateOptions {
  transcriptionId?: string;
  persistKey?: string;
  onTextChange?: (text: string) => void;
}

export const useClearRadioState = ({
  transcriptionId,
  persistKey = "radio-files",
  onTextChange,
}: ClearRadioStateOptions = {}) => {
  const clearAnalysisRef = useRef<(() => void) | null>(null);
  const editorResetRef = useRef<null | (() => void)>(null);
  const cleanupAttemptsRef = useRef<number>(0);
  const mountedRef = useRef(true);

  const handleEditorRegisterReset = useCallback((resetFn: () => void) => {
    editorResetRef.current = resetFn;
  }, []);

  const setClearAnalysis = useCallback((fn: () => void) => {
    clearAnalysisRef.current = fn;
  }, []);

  // Enhanced cleanup verification
  const ensureCleanup = useCallback(() => {
    if (!mountedRef.current || cleanupAttemptsRef.current >= 3) return;
    
    console.log('[useClearRadioState] Running cleanup verification');
    cleanupAttemptsRef.current += 1;
    
    const keysToCheck = [
      `radio-transcription-${transcriptionId}`,
      `radio-transcription-speaker-${transcriptionId}`,
      `transcription-timestamp-view-${transcriptionId}`,
      `transcription-editor-mode-${transcriptionId}`,
      `radio-content-analysis-${transcriptionId}`,
      `radio-transcription-text-content-${transcriptionId}`,
      `transcription-view-mode-${transcriptionId || "draft"}`
    ];
    
    keysToCheck.forEach(key => {
      try {
        if (sessionStorage.getItem(key)) {
          console.log(`[useClearRadioState] Cleaning up missed key: ${key}`);
          sessionStorage.removeItem(key);
        }
      } catch (error) {
        console.error(`[useClearRadioState] Error cleaning up key ${key}:`, error);
      }
    });
  }, [transcriptionId]);

  const clearAllState = useCallback(() => {
    if (!mountedRef.current) return;

    console.log('[useClearRadioState] Clearing all state');
    
    const keysToDelete = [
      `${persistKey}-metadata`,
      `${persistKey}-current-index`,
      "radio-transcription",
      "radio-transcription-draft",
      "radio-content-analysis-draft",
      "radio-content-analysis",
      "radio-transcription-speaker-draft",
      "transcription-timestamp-view-draft",
      "transcription-editor-mode-draft",
      "transcription-view-mode-draft",
      `${persistKey}-text-content`,
      "radio-transcription-text-content"
    ];

    if (transcriptionId) {
      keysToDelete.push(
        `radio-transcription-${transcriptionId}`,
        `radio-transcription-speaker-${transcriptionId}`,
        `transcription-timestamp-view-${transcriptionId}`,
        `transcription-editor-mode-${transcriptionId}`,
        `radio-content-analysis-${transcriptionId}`,
        `radio-transcription-text-content-${transcriptionId}`,
        `transcription-view-mode-${transcriptionId}`
      );
    }

    keysToDelete.forEach(key => {
      try {
        sessionStorage.removeItem(key);
        console.log(`[useClearRadioState] Cleared storage key: ${key}`);
      } catch (error) {
        console.error(`[useClearRadioState] Error clearing key ${key}:`, error);
      }
    });

    if (clearAnalysisRef.current) {
      try {
        clearAnalysisRef.current();
      } catch (error) {
        console.error('[useClearRadioState] Error clearing analysis state:', error);
      }
    }

    if (editorResetRef.current) {
      try {
        editorResetRef.current();
      } catch (error) {
        console.error('[useClearRadioState] Error in editor reset:', error);
      }
    }

    if (onTextChange) {
      onTextChange("");
    }
    
    // Run an additional check to ensure everything is properly cleaned up
    setTimeout(ensureCleanup, 100);
    
    console.log('[useClearRadioState] All state cleared');
  }, [persistKey, transcriptionId, onTextChange, ensureCleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      ensureCleanup();
    };
  }, [ensureCleanup]);

  return {
    clearAllState,
    handleEditorRegisterReset,
    setClearAnalysis
  };
};
