
import { useRadioTranscription } from './useRadioTranscription';
import { RadioNewsSegment } from '@/components/radio/RadioNewsSegmentsContainer';
import { TranscriptionResult } from '@/services/audio/transcriptionService';
import { useEffect, useRef } from 'react';

export const useTranscriptionManagement = () => {
  // Track component mounted state to prevent operations after unmount
  const isMountedRef = useRef(true);
  
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

  const handleTranscriptionTextChange = (text: string) => {
    if (isMountedRef.current) {
      handleTranscriptionChange(text);
    }
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
    resetTranscription
  };
};
