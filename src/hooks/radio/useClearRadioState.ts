
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
  
  const { 
    clearStorageKeys, 
    isClearing, 
    getRemainingKeys 
  } = useSafeStorage({
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

  // Function to generate all possible key patterns for cleaning
  const getAllPossibleKeys = useCallback((baseKey: string, id?: string): string[] => {
    const keysToDelete = [
      `${baseKey}-metadata`,
      `${baseKey}-current-index`,
      `${baseKey}-text-content`,
      `${baseKey}-notepad`,
      "radio-transcription",
      "radio-transcription-draft",
      "radio-content-analysis-draft",
      "radio-content-analysis",
      "radio-transcription-speaker-draft",
      "transcription-timestamp-view-draft",
      "transcription-editor-mode-draft",
      "transcription-view-mode-draft",
      "radio-transcription-text-content"
    ];

    if (id) {
      keysToDelete.push(
        `radio-transcription-${id}`,
        `radio-transcription-speaker-${id}`,
        `transcription-timestamp-view-${id}`,
        `transcription-editor-mode-${id}`,
        `radio-content-analysis-${id}`,
        `radio-transcription-text-content-${id}`,
        `transcription-view-mode-${id}`
      );
    }

    return keysToDelete;
  }, []);

  // Enhanced clear function with better error handling
  const clearAllState = useCallback(async (): Promise<boolean> => {
    if (!mountedRef.current) return false;

    console.log('[useClearRadioState] Starting state clearing process');
    
    // First collect all keys that need to be deleted
    const keysToDelete = getAllPossibleKeys(persistKey, transcriptionId);
    
    // Attempt to clear storage
    const storageSuccess = await clearStorageKeys(keysToDelete);

    // Call reset handlers regardless of storage operation success
    let resetSuccess = true;
    
    try {
      // Reset the editor if we have a handler
      if (editorResetRef.current) {
        console.log('[useClearRadioState] Calling editor reset function');
        try {
          editorResetRef.current();
        } catch (error) {
          console.error('[useClearRadioState] Error in editor reset:', error);
          resetSuccess = false;
        }
      }
      
      // Reset analysis if we have a handler
      if (clearAnalysisRef.current) {
        console.log('[useClearRadioState] Calling analysis reset function');
        try {
          clearAnalysisRef.current();
        } catch (error) {
          console.error('[useClearRadioState] Error in analysis reset:', error);
          resetSuccess = false;
        }
      }
      
      // Reset text content via callback if provided
      if (onTextChange) {
        console.log('[useClearRadioState] Calling onTextChange with empty string');
        try {
          onTextChange("");
        } catch (error) {
          console.error('[useClearRadioState] Error in onTextChange callback:', error);
          resetSuccess = false;
        }
      }
    } catch (error) {
      console.error('[useClearRadioState] Unexpected error during reset handlers:', error);
      resetSuccess = false;
    }

    // Force cleanup any remaining keys as a last resort
    const remainingKeys = getRemainingKeys(persistKey);
    if (remainingKeys.length > 0) {
      console.warn(`[useClearRadioState] Found ${remainingKeys.length} remaining keys with prefix ${persistKey}, attempting to clear`);
      await clearStorageKeys(remainingKeys);
    }

    console.log('[useClearRadioState] Clear completed with storage success:', storageSuccess, 'and reset success:', resetSuccess);
    return storageSuccess && resetSuccess;
  }, [persistKey, transcriptionId, onTextChange, clearStorageKeys, getRemainingKeys, getAllPossibleKeys]);

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
