
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
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { clearStorageKeys, isClearing, progress } = useSafeStorage({
    storage: 'sessionStorage',
    batchSize: 2,  // Only clear 2 items at a time
    batchDelay: 50, // Wait 50ms between batches
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

  // Improved state clearing implementation that can be cancelled
  const clearAllState = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return;
    
    // Create a new abort controller for this operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    console.log('[useClearRadioState] Starting clear all state operation');
    
    // Define keys to delete
    // Group keys by category for better batch processing
    const keysToDelete = {
      files: [
        `${persistKey}-metadata`,
        `${persistKey}-current-index`,
        `${persistKey}-text-content`,
      ],
      transcription: [
        "radio-transcription",
        "radio-transcription-draft",
        "radio-transcription-text-content",
        "radio-transcription-speaker-draft",
        "transcription-timestamp-view-draft",
        "transcription-editor-mode-draft",
        "transcription-view-mode-draft"
      ],
      analysis: [
        "radio-content-analysis-draft",
        "radio-content-analysis"
      ]
    };

    // Add transcription-specific keys if ID is available
    if (transcriptionId) {
      keysToDelete.transcription.push(
        `radio-transcription-${transcriptionId}`,
        `radio-transcription-speaker-${transcriptionId}`,
        `transcription-timestamp-view-${transcriptionId}`,
        `transcription-editor-mode-${transcriptionId}`,
        `transcription-view-mode-${transcriptionId}`,
        `radio-transcription-text-content-${transcriptionId}`
      );
      
      keysToDelete.analysis.push(
        `radio-content-analysis-${transcriptionId}`
      );
    }

    try {
      // Break clearing into separate operations by category
      // Start with files (smaller impact)
      if (signal.aborted) return;
      await new Promise(resolve => setTimeout(resolve, 10));
      await clearStorageKeys(keysToDelete.files);
      
      // Clear transcription data
      if (signal.aborted) return;
      await new Promise(resolve => setTimeout(resolve, 50));
      await clearStorageKeys(keysToDelete.transcription);
      
      // Clear analysis data
      if (signal.aborted) return;
      await new Promise(resolve => setTimeout(resolve, 50));
      await clearStorageKeys(keysToDelete.analysis);
      
      // Handle UI state clearing with proper yielding
      if (signal.aborted) return;
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Clear analysis state if available
      if (clearAnalysisRef.current) {
        try {
          clearAnalysisRef.current();
        } catch (error) {
          console.error('[useClearRadioState] Error clearing analysis state:', error);
        }
      }

      // Reset editor after more yielding
      if (signal.aborted) return;
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Reset editor if available
      if (editorResetRef.current) {
        try {
          editorResetRef.current();
        } catch (error) {
          console.error('[useClearRadioState] Error in editor reset:', error);
        }
      }

      // Wait a bit more before clearing text to ensure UI has updated
      if (signal.aborted) return;
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Clear text if callback is available
      if (onTextChange) {
        onTextChange("");
      }
      
      console.log('[useClearRadioState] Successfully cleared all state');
    } catch (error) {
      if (signal.aborted) {
        console.log('[useClearRadioState] Clear operation was cancelled');
      } else {
        console.error('[useClearRadioState] Error clearing state:', error);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [persistKey, transcriptionId, onTextChange, clearStorageKeys]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return {
    clearAllState,
    handleEditorRegisterReset,
    setClearAnalysis,
    isClearing,
    clearProgress: progress
  };
};
