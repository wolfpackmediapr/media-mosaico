
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

  const handleEditorRegisterReset = useCallback((resetFn: () => void) => {
    editorResetRef.current = resetFn;
  }, []);

  const setClearAnalysis = useCallback((fn: () => void) => {
    clearAnalysisRef.current = fn;
  }, []);

  // Cleanup function that ensures all resources are properly released
  const ensureCleanup = useCallback(() => {
    // Only try up to 3 times to prevent infinite loops
    if (cleanupAttemptsRef.current >= 3) return;
    
    console.log('[useClearRadioState] Running cleanup verification');
    cleanupAttemptsRef.current += 1;
    
    // Check for any lingering storage items that should have been cleared
    if (transcriptionId) {
      const keysToCheck = [
        `radio-transcription-${transcriptionId}`,
        `radio-transcription-speaker-${transcriptionId}`,
        `transcription-timestamp-view-${transcriptionId}`,
        `transcription-editor-mode-${transcriptionId}`,
        `radio-content-analysis-${transcriptionId}`,
        `radio-transcription-text-content-${transcriptionId}`
      ];
      
      keysToCheck.forEach(key => {
        if (sessionStorage.getItem(key)) {
          console.log(`[useClearRadioState] Cleaning up missed key: ${key}`);
          sessionStorage.removeItem(key);
        }
      });
    }
  }, [transcriptionId]);

  const clearAllState = useCallback(() => {
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
        `radio-transcription-text-content-${transcriptionId}`
      );
    }

    keysToDelete.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`[useClearRadioState] Cleared storage key: ${key}`);
    });

    const allKeys = Object.keys(sessionStorage);
    const patternPrefixes = [
      'radio-transcription',
      'transcription-editor',
      'transcription-timestamp',
      'radio-content-analysis',
      'radio-transcription-text'
    ];

    allKeys.forEach(key => {
      if (patternPrefixes.some(prefix => key.startsWith(prefix))) {
        console.log(`[useClearRadioState] Clearing additional key: ${key}`);
        sessionStorage.removeItem(key);
      }
    });

    if (clearAnalysisRef.current) {
      console.log('[useClearRadioState] Clearing analysis state');
      clearAnalysisRef.current();
    }

    if (editorResetRef.current) {
      console.log('[useClearRadioState] Calling editor reset function');
      editorResetRef.current();
    } else {
      console.log('[useClearRadioState] No editor reset function registered');
    }

    if (onTextChange) {
      onTextChange("");
    }
    
    // Run an additional check to ensure everything is properly cleaned up
    setTimeout(ensureCleanup, 100);
    
    console.log('[useClearRadioState] All state cleared');
  }, [persistKey, transcriptionId, onTextChange, ensureCleanup]);

  // Run cleanup check when the component unmounts
  useEffect(() => {
    return () => {
      // Final verification before unmounting
      ensureCleanup();
    };
  }, [ensureCleanup]);

  return {
    clearAllState,
    handleEditorRegisterReset,
    setClearAnalysis
  };
};
