
import { useRadioTranscription } from './useRadioTranscription';
import { RadioNewsSegment } from '@/components/radio/RadioNewsSegmentsContainer';
import { TranscriptionResult } from '@/services/audio/transcriptionService';
import { useEffect, useRef, useCallback } from 'react';

export const useTranscriptionManagement = () => {
  const isMountedRef = useRef(true);
  const cleanupFnsRef = useRef<Array<() => void>>([]);
  
  const {
    isProcessing,
    setIsProcessing,
    progress,
    setProgress,
    transcriptionText,
    setTranscriptionText,
    transcriptionId,
    setTranscriptionId,
    transcriptionResult,
    metadata,
    newsSegments,
    setNewsSegments,
    handleTranscriptionChange,
    handleSegmentsReceived,
    handleMetadataChange,
    handleTranscriptionReceived,
    resetTranscription
  } = useRadioTranscription();

  // Enhanced cleanup when component unmounts
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Execute all cleanup functions
      cleanupFnsRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      });
      cleanupFnsRef.current = [];
    };
  }, []);

  // Register a cleanup function
  const registerCleanup = useCallback((cleanupFn: () => void) => {
    cleanupFnsRef.current.push(cleanupFn);
  }, []);

  const handleTranscriptionTextChange = useCallback((text: string) => {
    if (isMountedRef.current) {
      handleTranscriptionChange(text);
    }
  }, [handleTranscriptionChange]);

  return {
    isProcessing,
    setIsProcessing,
    progress,
    setProgress,
    transcriptionText,
    setTranscriptionText,
    transcriptionId,
    setTranscriptionId,
    transcriptionResult,
    metadata,
    newsSegments,
    setNewsSegments,
    handleTranscriptionTextChange,
    handleSegmentsReceived,
    handleMetadataChange,
    handleTranscriptionReceived,
    resetTranscription,
    registerCleanup
  };
};
