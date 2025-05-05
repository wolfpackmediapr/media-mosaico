
import React from "react";
import RadioTranscriptionEditor from "../RadioTranscriptionEditor";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { RadioNewsSegment } from "../RadioNewsSegmentsContainer";

interface LeftSectionProps {
  currentLayout: string;
  currentTab: string;
  transcriptionResult?: TranscriptionResult;
  isProcessing: boolean;
  transcriptionText: string;
  onTranscriptionChange: (text: string) => void;
  currentTime?: number;
  onTimestampClick?: (timestamp: number) => void;
  segments: RadioNewsSegment[];
  segmentsFilter: string;
  onUpdateFilterText: (text: string) => void;
  onUpdateFilterType: (type: string) => void;
  isEditingSegments: boolean;
  toggleEditingSegments: () => void;
  onSegmentClick: (segment: RadioNewsSegment) => void;
  resetLocalContent: (() => void) | null;
  setResetFunction: (fn: () => void) => void;
  transcriptionId?: string;
  metadata?: any;
  setMetadata: (metadata: any) => void;
  onInfoGenerated: (info: any) => void;
  isAuthenticated?: boolean;
}

const LeftSection: React.FC<LeftSectionProps> = ({ 
  currentLayout,
  currentTab,
  transcriptionResult,
  isProcessing,
  transcriptionText,
  onTranscriptionChange,
  currentTime,
  onTimestampClick,
  segments,
  segmentsFilter,
  onUpdateFilterText,
  onUpdateFilterType,
  isEditingSegments,
  toggleEditingSegments,
  onSegmentClick,
  resetLocalContent,
  setResetFunction,
  transcriptionId,
  metadata,
  setMetadata,
  onInfoGenerated,
  isAuthenticated
}) => {
  // Only show transcription tab content for now
  if (currentTab === 'transcription') {
    return (
      <div className="w-full">
        <RadioTranscriptionEditor
          transcriptionText={transcriptionText}
          isProcessing={isProcessing}
          onTranscriptionChange={onTranscriptionChange}
          transcriptionId={transcriptionId}
          transcriptionResult={transcriptionResult}
          onTimestampClick={onTimestampClick}
          registerReset={setResetFunction}
          currentTime={currentTime}
        />
      </div>
    );
  }
  
  // Return empty for other tabs
  return <div>Contenido no disponible</div>;
};

export default LeftSection;
