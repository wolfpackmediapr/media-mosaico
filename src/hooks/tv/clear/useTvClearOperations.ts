import { useCallback } from 'react';

interface UploadedFile extends File {
  preview?: string;
}

interface ClearOperationsOptions {
  files: UploadedFile[];
  setFiles?: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setNewsSegments?: React.Dispatch<React.SetStateAction<any[]>>;
  setTranscriptionText?: React.Dispatch<React.SetStateAction<string>>;
  resetTranscription?: () => void;
  onTextChange?: (text: string) => void;
  persistKey: string;
}

export const useTvClearOperations = ({
  files,
  setFiles,
  setNewsSegments,
  setTranscriptionText,
  resetTranscription,
  onTextChange,
  persistKey
}: ClearOperationsOptions) => {
  
  // Clean up blob URLs to prevent memory leaks
  const cleanupBlobUrls = useCallback((filesToCleanup: UploadedFile[]): void => {
    if (!filesToCleanup || filesToCleanup.length === 0) return;
    
    console.log(`[useTvClearOperations] Cleaning up ${filesToCleanup.length} blob URLs`);
    
    filesToCleanup.forEach(file => {
      if (file && 'preview' in file && file.preview && typeof file.preview === 'string') {
        try {
          URL.revokeObjectURL(file.preview);
          console.log(`[useTvClearOperations] Revoked blob URL: ${file.preview}`);
        } catch (e) {
          console.error(`[useTvClearOperations] Failed to revoke blob URL:`, e);
        }
      }
    });
  }, []);

  const clearUIState = useCallback(() => {
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
    
    return filesToCleanup;
  }, [files, setFiles, setNewsSegments, setTranscriptionText]);

  const clearTranscription = useCallback(() => {
    if (resetTranscription) {
      try {
        resetTranscription();
        console.log('[useTvClearOperations] Transcription reset complete');
      } catch (err) {
        console.error('[useTvClearOperations] Error during resetTranscription:', err);
      }
    }
  }, [resetTranscription]);

  const clearStorage = useCallback(() => {
    try {
      // Clear persistent state
      sessionStorage.removeItem(persistKey);
      sessionStorage.removeItem(`${persistKey}-transcription`);
      sessionStorage.removeItem(`${persistKey}-notepad`);
      
      if (onTextChange) {
        onTextChange('');
      }
    } catch (err) {
      console.error('[useTvClearOperations] Error clearing storage:', err);
    }
  }, [persistKey, onTextChange]);

  return {
    cleanupBlobUrls,
    clearUIState,
    clearTranscription,
    clearStorage
  };
};