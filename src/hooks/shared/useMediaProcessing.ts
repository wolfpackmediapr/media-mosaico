// Shared media processing hook logic

import { useState } from 'react';
import { MediaFileProcessingState } from '@/types/media';

export const useMediaProcessing = () => {
  const [processingState, setProcessingState] = useState<MediaFileProcessingState>({
    isProcessing: false,
    progress: 0
  });

  const startProcessing = () => {
    setProcessingState({
      isProcessing: true,
      progress: 0
    });
  };

  const updateProgress = (progress: number) => {
    setProcessingState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress))
    }));
  };

  const completeProcessing = () => {
    setProcessingState({
      isProcessing: false,
      progress: 100
    });
  };

  const resetProcessing = () => {
    setProcessingState({
      isProcessing: false,
      progress: 0
    });
  };

  const setProcessingError = () => {
    setProcessingState({
      isProcessing: false,
      progress: 0
    });
  };

  return {
    ...processingState,
    startProcessing,
    updateProgress,
    completeProcessing,
    resetProcessing,
    setProcessingError
  };
};