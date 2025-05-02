
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
    
    // Enhanced list of keys to delete, including view mode and interactive transcription data
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
      "transcription-view-mode",  // Add the base view mode key
      `${persistKey}-text-content`,
      "radio-transcription-text-content",
      "radio-interactive-scroll-position", // Add scroll position related keys
      "radio-active-segment", // Add active segment tracking
      "radio-segments-expanded" // Add segments expanded state
    ];

    if (transcriptionId) {
      keysToDelete.push(
        `radio-transcription-${transcriptionId}`,
        `radio-transcription-speaker-${transcriptionId}`,
        `transcription-timestamp-view-${transcriptionId}`,
        `transcription-editor-mode-${transcriptionId}`,
        `transcription-view-mode-${transcriptionId}`,  // Add the ID-specific view mode key
        `radio-content-analysis-${transcriptionId}`,
        `radio-transcription-text-content-${transcriptionId}`,
        `radio-active-segment-${transcriptionId}`, // Add ID-specific active segment
        `radio-segments-${transcriptionId}` // Add segments data storage
      );
    }

    try {
      const success = await clearStorageKeys(keysToDelete);

      if (success) {
        // Clear analysis state if reference exists
        if (clearAnalysisRef.current) {
          try {
            clearAnalysisRef.current();
            console.log('[useClearRadioState] Analysis state cleared');
          } catch (error) {
            console.error('[useClearRadioState] Error clearing analysis state:', error);
          }
        }

        // Reset editor if reference exists
        if (editorResetRef.current) {
          try {
            editorResetRef.current();
            console.log('[useClearRadioState] Editor reset completed');
          } catch (error) {
            console.error('[useClearRadioState] Error in editor reset:', error);
          }
        }

        // Update text content via callback if provided
        if (onTextChange) {
          onTextChange("");
          console.log('[useClearRadioState] Text content cleared via callback');
        }
        
        console.log('[useClearRadioState] All state successfully cleared');
        return true;
      } else {
        console.error('[useClearRadioState] Failed to clear storage keys');
        return false;
      }
    } catch (error) {
      console.error('[useClearRadioState] Error in clearAllState:', error);
      return false;
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
