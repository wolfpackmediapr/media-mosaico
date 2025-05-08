
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

  // Improved state clearing implementation to avoid UI freezing
  // Modified to return Promise<void> instead of Promise<boolean>
  const clearAllState = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return;
    
    console.log('[useClearRadioState] Starting clear all state operation');
    
    // Define keys to delete
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

    // Add transcription-specific keys if ID is available
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

    // Use Promise to handle storage clearing
    try {
      // Use microtask to avoid UI freezing
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Clear storage in batches to avoid blocking UI
      const batchSize = 5;
      for (let i = 0; i < keysToDelete.length; i += batchSize) {
        const batch = keysToDelete.slice(i, i + batchSize);
        await clearStorageKeys(batch);
        
        // Small delay between batches to let UI breathe
        if (i + batchSize < keysToDelete.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Handle UI-related operations with delays to prevent freeze
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Clear analysis state if available
      if (clearAnalysisRef.current) {
        try {
          clearAnalysisRef.current();
        } catch (error) {
          console.error('[useClearRadioState] Error clearing analysis state:', error);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Reset editor if available
      if (editorResetRef.current) {
        try {
          editorResetRef.current();
        } catch (error) {
          console.error('[useClearRadioState] Error in editor reset:', error);
        }
      }

      // Clear text if callback is available
      if (onTextChange) {
        onTextChange("");
      }
      
      console.log('[useClearRadioState] Successfully cleared all state');
      // No return value needed anymore
    } catch (error) {
      console.error('[useClearRadioState] Error clearing state:', error);
      // No return value needed anymore
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
