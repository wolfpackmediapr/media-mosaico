
import React from "react";
import RadioTranscriptionEditor from "../RadioTranscriptionEditor";
import { RadioNewsSegment } from "../RadioNewsSegmentsContainer";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import NeedsAuthPlaceholder from "../NeedsAuthPlaceholder";

interface LeftSectionProps {
  currentLayout: string;
  currentTab: string;
  transcriptionResult?: TranscriptionResult;
  isProcessing: boolean;
  transcriptionText: string;
  onTranscriptionChange: (text: string) => void;
  currentTime: number;
  onTimestampClick: (segment: RadioNewsSegment | number) => void;
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
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  };
  setMetadata: (metadata: any) => void;
  onInfoGenerated: (text: string) => void;
  isAuthenticated: boolean;
}

const LeftSection: React.FC<LeftSectionProps> = (props) => {
  const { 
    currentTab, 
    transcriptionText, 
    onTranscriptionChange, 
    currentTime, 
    segments,
    resetLocalContent,
    setResetFunction,
    transcriptionId,
    metadata,
    setMetadata,
    onInfoGenerated,
    isAuthenticated,
  } = props;

  // Only render editor for transcription tab
  if (currentTab === "transcription") {
    return (
      <div className="h-full">
        {!isAuthenticated && (
          <div className="mb-4">
            <NeedsAuthPlaceholder 
              message="Las transcripciones no se guardarán sin iniciar sesión" 
            />
          </div>
        )}
        
        <RadioTranscriptionEditor
          transcriptionText={transcriptionText}
          onTextChange={onTranscriptionChange}
          currentPlaybackTime={currentTime}
          segments={segments}
          resetLocalContent={resetLocalContent}
          setResetFunction={setResetFunction}
          transcriptionId={transcriptionId}
          metadata={metadata}
          setMetadata={setMetadata}
          onInfoGenerated={onInfoGenerated}
        />
      </div>
    );
  }

  // Default empty state for other tabs
  return <div className="h-full">No hay contenido disponible</div>;
};

export default LeftSection;
