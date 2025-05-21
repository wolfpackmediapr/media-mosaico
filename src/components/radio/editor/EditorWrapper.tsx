
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import EditorControls from './EditorControls';
import EditorContent from './EditorContent';
import { TranscriptionResult } from '@/services/audio/transcriptionService';

interface EditorWrapperProps {
  text: string;
  isProcessing: boolean;
  isEditing: boolean;
  showTimestamps: boolean;
  hasTimestampData: boolean;
  isLoadingUtterances?: boolean;
  isSaving?: boolean;
  transcriptionResult?: TranscriptionResult;
  onTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  toggleTimestampView: () => void;
  toggleEditMode: () => void;
  onTimestampClick?: (timestamp: number) => void;
  onTextAreaClick?: () => void;
}

const EditorWrapper = ({
  text,
  isProcessing,
  isEditing,
  showTimestamps,
  hasTimestampData,
  isLoadingUtterances = false,
  isSaving = false,
  transcriptionResult,
  onTextChange,
  toggleTimestampView,
  toggleEditMode,
  onTimestampClick,
  onTextAreaClick
}: EditorWrapperProps) => {
  return (
    <Card className="relative w-full">
      <EditorControls
        showTimestamps={showTimestamps}
        isEditing={isEditing}
        hasTimestampData={hasTimestampData}
        isProcessing={isProcessing}
        isSaving={isSaving}
        toggleTimestampView={toggleTimestampView}
        toggleEditMode={toggleEditMode}
        text={text}
      />
      
      <CardContent className="pt-8">
        <EditorContent
          showTimestamps={showTimestamps}
          hasTimestampData={hasTimestampData}
          isEditing={isEditing}
          isProcessing={isProcessing}
          isLoadingUtterances={isLoadingUtterances}
          text={text}
          transcriptionResult={transcriptionResult}
          onTextChange={onTextChange}
          onTimestampClick={onTimestampClick}
          onTextAreaClick={onTextAreaClick}
        />
      </CardContent>
    </Card>
  );
};

export default EditorWrapper;
