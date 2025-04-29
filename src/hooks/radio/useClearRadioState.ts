
import { useEffect, useRef, useCallback } from 'react';
import { useSafeStorage } from '../use-safe-storage';

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
  const mountedRef = useRef(true);
  
  const { clearStorageKeys, isClearing } = useSafeStorage({
    storage: 'sessionStorage',
    onError: (error) => {
      console.error('[useClearRadioState] Storage error:', error);
    }
  });

  const handleEditorRegisterReset = useCallback((resetFn: () => void) => {
    editorResetRef.current = resetFn;
  }, []);

  const setClearAnalysis = useCallback((fn: () => void) => {
    clearAnalysisRef.current = fn;
  }, []);

  const clearAllState = useCallback(async () => {
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

    const success = await clearStorageKeys(keysToDelete);

    if (success) {
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
    }
  }, [persistKey, transcriptionId, onTextChange, clearStorageKeys]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    clearAllState,
    handleEditorRegisterReset,
    setClearAnalysis,
    isClearing
  };
};
