import { useCallback, useState, useRef, useEffect } from 'react';
import { useClearAllState } from './useClearAllState';
import { UploadedFile } from '@/components/radio/types';

interface UseRadioClearStateOptions {
  transcriptionId?: string;
  persistKey?: string;
  onTextChange?: (text: string) => void;
  files?: UploadedFile[];
  setFiles?: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setNewsSegments?: React.Dispatch<React.SetStateAction<any[]>>;
  setTranscriptionText?: React.Dispatch<React.SetStateAction<string>>;
  resetTranscription?: () => void;
}

export const useRadioClearState = ({
  transcriptionId,
  persistKey = "radio-files",
  onTextChange,
  files = [],
  setFiles,
  setNewsSegments,
  setTranscriptionText,
  resetTranscription,
}: UseRadioClearStateOptions = {}) => {
  const cancelTokenRef = useRef<boolean>(false);
  const mountedRef = useRef(true);
  
  // Use the enhanced clear state hook
  const {
    clearAllState: baseClearAllState,
    handleEditorRegisterReset,
    setClearAnalysis,
    clearProgress,
    clearingStage,
    isClearing
  } = useClearAllState({
    transcriptionId,
    persistKey,
    onTextChange
  });

  // Clean up blob URLs to prevent memory leaks
  const cleanupBlobUrls = useCallback((filesToCleanup: UploadedFile[]): void => {
    if (!filesToCleanup || filesToCleanup.length === 0) return;
    
    console.log(`[useRadioClearState] Cleaning up ${filesToCleanup.length} blob URLs`);
    
    filesToCleanup.forEach(file => {
      if (file && 'preview' in file && file.preview && typeof file.preview === 'string') {
        try {
          URL.revokeObjectURL(file.preview);
          console.log(`[useRadioClearState] Revoked blob URL: ${file.preview}`);
        } catch (e) {
          console.error(`[useRadioClearState] Failed to revoke blob URL:`, e);
        }
      }
    });
  }, []);

  // Enhanced clear all function that handles UI state and resources
  const handleClearAll = useCallback(async (): Promise<boolean> => {
    if (isClearing) {
      console.warn('[useRadioClearState] Clear operation already in progress');
      return false;
    }
    
    console.log('[useRadioClearState] Starting comprehensive clear sequence');
    cancelTokenRef.current = false;
    
    try {
      // Step 1: Clear UI components first
      const filesToCleanup = [...files];
      
      // Reset UI state immediately for better UX
      if (setTranscriptionText) {
        setTranscriptionText('');
      }
      
      if (setNewsSegments) {
        setNewsSegments([]);
      }
      
      if (setFiles) {
        setFiles([]);
      }
      
      // Step 2: Call reset functions
      if (resetTranscription) {
        try {
          resetTranscription();
          console.log('[useRadioClearState] Transcription reset complete');
        } catch (err) {
          console.error('[useRadioClearState] Error during resetTranscription:', err);
        }
      }
      
      // Step 3: Clean up resources
      cleanupBlobUrls(filesToCleanup);
      
      // Step 4: Clear storage and validate
      const storageSuccess = await baseClearAllState();
      
      console.log('[useRadioClearState] Clear sequence completed:', storageSuccess);
      return storageSuccess;
      
    } catch (error) {
      console.error('[useRadioClearState] Critical error during clear operation:', error);
      return false;
    }
  }, [
    isClearing,
    files,
    setTranscriptionText,
    setNewsSegments,
    setFiles,
    resetTranscription,
    cleanupBlobUrls,
    baseClearAllState
  ]);
  
  // Keep track of mounted state for cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cancelTokenRef.current = true;
    };
  }, []);

  return {
    handleClearAll,
    handleEditorRegisterReset,
    setClearAnalysis,
    isClearing,
    clearingProgress: clearProgress,
    clearingStage
  };
};
