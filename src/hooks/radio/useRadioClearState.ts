import { useCallback, useState, useRef, useEffect } from 'react';
import { useSafeStorage } from '../use-safe-storage';
import { useClearRadioState } from './useClearRadioState';
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
  const [clearingProgress, setClearingProgress] = useState(0);
  const [clearingStage, setClearingStage] = useState<string>('');
  const cancelTokenRef = useRef<boolean>(false);
  const mountedRef = useRef(true);
  
  // Use the base clear state hook
  const {
    clearAllState,
    handleEditorRegisterReset,
    setClearAnalysis,
    isClearing
  } = useClearRadioState({
    transcriptionId,
    persistKey,
    onTextChange
  });

  // Force clear all session storage keys related to radio
  const forceClearAllSessionStorageKeys = useCallback((): boolean => {
    try {
      const keysToDelete: string[] = [];
      
      // Find and collect all radio-related keys from session storage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
            key.startsWith('radio-') || 
            key.startsWith(`${persistKey}`) || 
            key.includes('transcription') ||
            key.includes('speaker')
        )) {
          keysToDelete.push(key);
        }
      }
      
      console.log(`[useRadioClearState] Found ${keysToDelete.length} keys to force remove`);
      
      // Delete all found keys
      keysToDelete.forEach(key => {
        try {
          console.log(`[useRadioClearState] Forcing removal of session storage key: ${key}`);
          sessionStorage.removeItem(key);
        } catch (e) {
          console.error(`[useRadioClearState] Error removing key ${key}:`, e);
        }
      });
      
      return keysToDelete.length > 0;
    } catch (e) {
      console.error('[useRadioClearState] Error in forceClearAllSessionStorageKeys:', e);
      return false;
    }
  }, [persistKey]);

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

  // Enhanced clear all function with detailed progress reporting
  const handleClearAll = useCallback(async (): Promise<boolean> => {
    if (isClearing) {
      console.warn('[useRadioClearState] Clear operation already in progress');
      return false;
    }
    
    console.log('[useRadioClearState] Starting clear sequence');
    cancelTokenRef.current = false;
    
    setClearingProgress(5);
    setClearingStage('Iniciando limpieza');
    
    try {
      // Step 1: Reset in-memory state first
      setClearingProgress(10);
      setClearingStage('Limpiando componentes');
      
      // Keep reference to files for cleanup
      const filesToCleanup = [...files];
      
      // Reset UI state in this specific order for best results
      if (setTranscriptionText) {
        setTranscriptionText('');
        console.log('[useRadioClearState] Transcription text reset');
      }
      
      if (setNewsSegments) {
        setNewsSegments([]);
        console.log('[useRadioClearState] News segments cleared');
      }
      
      // Clear files and reset index
      if (setFiles) {
        setFiles([]);
        console.log('[useRadioClearState] Files state cleared');
      }
      
      if (cancelTokenRef.current) return false;
      
      // Step 2: Call reset functions directly
      setClearingProgress(30);
      setClearingStage('Reiniciando sistema');
      
      // Call resetTranscription if available (resets all transcription state)
      if (resetTranscription) {
        try {
          resetTranscription();
          console.log('[useRadioClearState] Transcription reset complete');
        } catch (err) {
          console.error('[useRadioClearState] Error during resetTranscription:', err);
        }
      }
      
      if (cancelTokenRef.current) return false;
      setClearingProgress(50);
      
      // Step 3: Clean up blob URLs
      setClearingStage('Limpiando recursos');
      cleanupBlobUrls(filesToCleanup);
      
      if (cancelTokenRef.current) return false;
      setClearingProgress(70);
      
      // Step 4: Clear all session storage
      setClearingStage('Limpiando almacenamiento');
      
      try {
        // First try the normal way
        const clearSuccess = await clearAllState();
        console.log('[useRadioClearState] Storage cleared via clearAllState:', clearSuccess);
        
        if (!clearSuccess || cancelTokenRef.current) {
          // Force clear as a backup if primary clear failed
          forceClearAllSessionStorageKeys();
          console.log('[useRadioClearState] Forced clear completed as fallback');
        }
      } catch (error) {
        console.error('[useRadioClearState] Error during storage clearing:', error);
        
        // Try force clearing as a fallback
        forceClearAllSessionStorageKeys();
        console.log('[useRadioClearState] Forced clear executed after error');
      }
      
      // Set progress to complete
      setClearingProgress(100);
      setClearingStage('Completado');
      
      // Wait a bit before resetting progress indicators
      setTimeout(() => {
        if (mountedRef.current) {
          setClearingProgress(0);
          setClearingStage('');
        }
      }, 700);
      
      return true;
    } catch (error) {
      console.error('[useRadioClearState] Critical error during clear operation:', error);
      
      // Try force clearing as a last resort
      const forcedClear = forceClearAllSessionStorageKeys();
      console.log('[useRadioClearState] Last resort forced clear executed:', forcedClear);
      
      setClearingProgress(0);
      setClearingStage(forcedClear ? 'Completado con errores' : 'Error');
      return false;
    }
  }, [
    isClearing,
    clearAllState,
    resetTranscription,
    setNewsSegments,
    setTranscriptionText,
    setFiles,
    files,
    cleanupBlobUrls,
    forceClearAllSessionStorageKeys
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
    clearingProgress,
    clearingStage
  };
};
