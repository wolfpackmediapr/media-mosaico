
import React, { memo, useCallback } from 'react';
import RadioTimestampedTranscription from '../RadioTimestampedTranscription';
import TranscriptionTextArea from './TranscriptionTextArea';
import { TranscriptionResult } from '@/services/audio/transcriptionService';

interface EditorContentProps {
  showTimestamps: boolean;
  hasTimestampData: boolean;
  isEditing: boolean;
  isProcessing: boolean;
  isLoadingUtterances: boolean;
  text: string;
  transcriptionResult?: TranscriptionResult;
  onTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onTimestampClick?: (timestamp: number) => void;
  onTextAreaClick?: () => void;
}

// Enhanced memo comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps: EditorContentProps, nextProps: EditorContentProps) => {
  // Only re-render when these props change
  return (
    prevProps.showTimestamps === nextProps.showTimestamps &&
    prevProps.hasTimestampData === nextProps.hasTimestampData &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.isProcessing === nextProps.isProcessing &&
    prevProps.isLoadingUtterances === nextProps.isLoadingUtterances &&
    prevProps.text === nextProps.text &&
    prevProps.transcriptionResult === nextProps.transcriptionResult
  );
};

// Memoize the component to prevent unnecessary re-renders
const EditorContent = memo(({
  showTimestamps,
  hasTimestampData,
  isEditing,
  isProcessing,
  isLoadingUtterances,
  text,
  transcriptionResult,
  onTextChange,
  onTimestampClick,
  onTextAreaClick,
}: EditorContentProps) => {
  console.log('[EditorContent] Rendering with text length:', text?.length);
  
  // Memoize text change handler
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange(e);
  }, [onTextChange]);
  
  if (showTimestamps && hasTimestampData) {
    return (
      <RadioTimestampedTranscription 
        transcriptionResult={transcriptionResult}
        text={text}
        onTimestampClick={onTimestampClick}
        isLoading={isLoadingUtterances}
      />
    );
  }

  return (
    <TranscriptionTextArea
      text={text}
      isProcessing={isProcessing}
      isEditing={isEditing}
      onChange={handleTextChange}
      onClick={onTextAreaClick}
    />
  );
}, arePropsEqual);

EditorContent.displayName = 'EditorContent';

export default EditorContent;
