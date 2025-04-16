
import React from 'react';
import TranscriptionModeToggle from './TranscriptionModeToggle';
import CopyTextButton from './CopyTextButton';
import StatusIndicator from './StatusIndicator';

interface EditorControlsProps {
  showTimestamps: boolean;
  isEditing: boolean;
  hasTimestampData: boolean;
  isProcessing: boolean;
  isSaving: boolean;
  toggleTimestampView: () => void;
  toggleEditMode: () => void;
  text: string;
}

const EditorControls = ({
  showTimestamps,
  isEditing,
  hasTimestampData,
  isProcessing,
  isSaving,
  toggleTimestampView,
  toggleEditMode,
  text,
}: EditorControlsProps) => {
  return (
    <div className="absolute top-2 right-2 flex flex-col gap-2">
      <TranscriptionModeToggle
        showTimestamps={showTimestamps}
        isEditing={isEditing}
        hasTimestampData={hasTimestampData}
        isProcessing={isProcessing}
        toggleTimestampView={toggleTimestampView}
        toggleEditMode={toggleEditMode}
      />
      <CopyTextButton text={text} isProcessing={isProcessing} />
      <StatusIndicator isSaving={isSaving} />
    </div>
  );
};

export default EditorControls;
