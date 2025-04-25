
import { useRadioTranscription } from './useRadioTranscription';
import { RadioNewsSegment } from '@/components/radio/RadioNewsSegmentsContainer';
import { TranscriptionResult } from '@/services/audio/transcriptionService';

export const useTranscriptionManagement = () => {
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
    handleTranscriptionChange(text);
  };

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
