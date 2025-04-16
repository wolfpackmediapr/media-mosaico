
import React from 'react';
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

const EditorContent = ({
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
      onChange={onTextChange}
      onClick={onTextAreaClick}
    />
  );
};

export default EditorContent;
