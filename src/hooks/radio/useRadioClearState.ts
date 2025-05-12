
import { useCallback, useState, useRef } from 'react';
import { useSafeStorage } from '../use-safe-storage';
import { useClearRadioState } from './useClearRadioState';

interface UseRadioClearStateOptions {
  transcriptionId?: string;
  persistKey?: string;
  onTextChange?: (text: string) => void;
  files?: any[];
  setFiles?: React.Dispatch<React.SetStateAction<any[]>>;
  setNewsSegments?: React.Dispatch<React.SetStateAction<any[]>>;
  setTranscriptionText?: React.Dispatch<React.SetStateAction<string>>;
  resetTranscription?: () => void; // Add reset function from useRadioTranscription
}

export const useRadioClearState = ({
  transcriptionId,
  persistKey = "radio-files",
  onTextChange,
  files = [],
  setFiles,
  setNewsSegments,
  setTranscriptionText,
  resetTranscription, // Add reset function
}: UseRadioClearStateOptions = {}) => {
  const [clearingProgress, setClearingProgress] = useState(0);
  const [clearingStage, setClearingStage] = useState<string>('');
  const editorResetFnRef = useRef<(() => void) | null>(null);
  const analysisResetFnRef = useRef<(() => void) | null>(null);
  
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

  // Register the editor reset function
  const handleRegisterEditorReset = useCallback((resetFn: () => void) => {
    editorResetFnRef.current = resetFn;
    // Also register with the base hook
    handleEditorRegisterReset(resetFn);
  }, [handleEditorRegisterReset]);
  
  // Register the analysis reset function
  const handleRegisterAnalysisReset = useCallback((resetFn: () => void) => {
    analysisResetFnRef.current = resetFn;
    // Also register with the base hook
    setClearAnalysis(resetFn);
  }, [setClearAnalysis]);

  // Force clear all session storage keys related to radio
  const forceClearAllSessionStorageKeys = useCallback(() => {
    const keysToDelete = [];
    
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
  }, [persistKey]);

  // Enhanced clear all function with progress reporting
  const handleClearAll = useCallback(async () => {
    if (isClearing) return;
    
    console.log('[RadioClearState] handleClearAll: Starting clear sequence');
    
    setClearingProgress(5);
    setClearingStage('Iniciando limpieza');
    
    // Step 1: Call reset functions directly
    setClearingProgress(10);
    setClearingStage('Limpiando componentes');
    
    // Call resetTranscription if available (resets all transcription state)
    if (resetTranscription) {
      resetTranscription();
      console.log('[RadioClearState] Called resetTranscription');
    }
    
    // Reset editor content if available
    if (editorResetFnRef.current) {
      try {
        editorResetFnRef.current();
        console.log('[RadioClearState] Called editor reset function');
      } catch (err) {
        console.error('[RadioClearState] Editor reset error:', err);
      }
    }
    
    // Reset analysis content if available
    if (analysisResetFnRef.current) {
      try {
        analysisResetFnRef.current();
        console.log('[RadioClearState] Called analysis reset function');
      } catch (err) {
        console.error('[RadioClearState] Analysis reset error:', err);
      }
    }
    
    // Step 2: Reset UI state directly through setters
    setClearingProgress(30);
    setClearingStage('Limpiando interfaz');
    
    // Clear news segments
    if (setNewsSegments) {
      setNewsSegments([]);
      console.log('[RadioClearState] News segments cleared');
    }
    
    // Reset transcription text
    setClearingStage('Reiniciando transcripción');
    if (setTranscriptionText) {
      setTranscriptionText('');
      console.log('[RadioClearState] Transcription text reset');
    }
    
    if (onTextChange) {
      onTextChange('');
      console.log('[RadioClearState] Text change callback called with empty string');
    }
    
    // Step 3: Reset files
    setClearingProgress(50);
    setClearingStage('Limpiando archivos');
    if (setFiles) {
      // Keep reference to files for cleanup
      const filesToCleanup = [...files];
      
      // Clear files from state
      setFiles([]);
      
      // Clean up blob URLs
      filesToCleanup.forEach(file => {
        if ('preview' in file && file.preview && typeof file.preview === 'string') {
          try {
            URL.revokeObjectURL(file.preview);
          } catch (e) {
            // Ignore revocation errors
          }
        }
      });
      console.log('[RadioClearState] Files cleared');
    }
    
    // Step 4: Clear all session storage
    setClearingProgress(70);
    setClearingStage('Limpiando almacenamiento');
    
    try {
      // First try the normal way
      await clearAllState();
      console.log('[RadioClearState] Storage cleared via clearAllState');
      
      // Force clear all session storage as a backup measure
      forceClearAllSessionStorageKeys();
      console.log('[RadioClearState] Storage cleared by direct force');
      
      // Set progress to complete
      setClearingProgress(100);
      setClearingStage('Completado');
      
      // Wait a bit before resetting progress indicators
      setTimeout(() => {
        setClearingProgress(0);
        setClearingStage('');
      }, 700);
      
      return true;
    } catch (error) {
      console.error('[RadioClearState] Error clearing state:', error);
      
      // Try force clearing as a fallback
      const forcedClear = forceClearAllSessionStorageKeys();
      console.log('[RadioClearState] Forced clear successful:', forcedClear);
      
      setClearingProgress(0);
      setClearingStage(forcedClear ? 'Completado' : 'Error');
      return forcedClear;
    }
  }, [
    isClearing, 
    clearAllState, 
    resetTranscription,
    setNewsSegments, 
    setTranscriptionText, 
    onTextChange, 
    setFiles, 
    files,
    forceClearAllSessionStorageKeys
  ]);
  
  return {
    handleClearAll,
    handleEditorRegisterReset: handleRegisterEditorReset,
    setClearAnalysis: handleRegisterAnalysisReset,
    isClearing,
    clearingProgress,
    clearingStage
  };
};
