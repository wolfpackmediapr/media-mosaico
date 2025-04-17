
import React from 'react';
import RadioTimestampedTranscription from '../RadioTimestampedTranscription';
import TranscriptionTextArea from './TranscriptionTextArea';
import FormattedTranscriptionEditor from './FormattedTranscriptionEditor';
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

  // When not showing timestamps and editing, use the formatted editor
  if (isEditing) {
    return (
      <FormattedTranscriptionEditor
        text={text}
        isEditing={isEditing}
        isProcessing={isProcessing}
        onChange={onTextChange}
        onClick={onTextAreaClick}
      />
    );
  }

  // Fallback: classic textarea (readonly or not editing)
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
