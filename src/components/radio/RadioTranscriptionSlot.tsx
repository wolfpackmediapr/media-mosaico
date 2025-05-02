
import { Card, CardContent } from "@/components/ui/card";
import React, { useEffect, useRef, useState } from "react";
import RadioTranscriptionMetadata from "./RadioTranscriptionMetadata";
import RadioTranscriptionEditor from "./RadioTranscriptionEditor";
import RadioReportButton from "./RadioReportButton";
import { RadioNewsSegment } from "./RadioNewsSegmentsContainer";
import { useRadioSegmentGenerator } from "@/hooks/radio/useRadioSegmentGenerator";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { InteractiveTranscription, ViewModeToggle } from "./interactive-transcription";

interface RadioTranscriptionSlotProps {
  isProcessing: boolean;
  transcriptionText: string;
  transcriptionResult?: TranscriptionResult;
  transcriptionId?: string;
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  };
  onTranscriptionChange: (text: string) => void;
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void;
  onMetadataChange?: (metadata: {
    emisora: string;
    programa: string;
    horario: string;
    categoria: string;
    station_id: string;
    program_id: string;
  }) => void;
  onTimestampClick?: (segment: RadioNewsSegment) => void;
  // Add prop to allow parent to get access to the editor's reset method
  registerEditorReset?: (fn: () => void) => void;
  // New props for audio player integration
  isPlaying?: boolean;
  currentTime?: number;
  onPlayPause?: () => void;
  onSeek?: (timeOrSegment: number | RadioNewsSegment) => void;
}

const RadioTranscriptionSlot = ({
  isProcessing,
  transcriptionText,
  transcriptionResult,
  transcriptionId,
  metadata,
  onTranscriptionChange,
  onSegmentsReceived,
  onMetadataChange,
  onTimestampClick,
  registerEditorReset,
  // Audio player props with defaults
  isPlaying = false,
  currentTime = 0,
  onPlayPause = () => {},
  onSeek = () => {},
}: RadioTranscriptionSlotProps) => {
  const { checkAndGenerateSegments } = useRadioSegmentGenerator(onSegmentsReceived);
  
  // Store view mode with proper key including transcription ID
  const [viewMode, setViewMode] = usePersistentState<'interactive' | 'edit'>(
    `transcription-view-mode-${transcriptionId || "draft"}`,
    'edit',
    { storage: 'sessionStorage' }
  );

  const hasUtterances = !!transcriptionResult?.utterances && 
                        transcriptionResult.utterances.length > 0;

  // Check for segment generation when transcription changes
  useEffect(() => {
    if (transcriptionResult) {
      checkAndGenerateSegments(transcriptionResult);
    } else {
      checkAndGenerateSegments(transcriptionText);
    }
  }, [transcriptionText, transcriptionResult, checkAndGenerateSegments]);

  // Reset view mode to edit when transcription text is cleared
  useEffect(() => {
    if (!transcriptionText) {
      console.log('[RadioTranscriptionSlot] Transcription cleared, resetting view mode to edit');
      setViewMode('edit');
    }
  }, [transcriptionText, setViewMode]);
  
  // Reset view mode when transcription result changes to null/undefined
  useEffect(() => {
    if (!transcriptionResult?.utterances || transcriptionResult.utterances.length === 0) {
      console.log('[RadioTranscriptionSlot] Transcription result cleared, resetting view mode to edit');
      setViewMode('edit');
    }
  }, [transcriptionResult, setViewMode]);

  // Local state to store the reset method
  const resetFnRef = useRef<() => void>(() => {});
  // Pass a callback down to RadioTranscriptionEditor that lets it "register" its reset function
  const handleRegisterReset = (fn: () => void) => {
    resetFnRef.current = fn;
    if (registerEditorReset) {
      registerEditorReset(fn);
    }
  };

  // Handle view mode change
  const handleViewModeChange = (mode: 'interactive' | 'edit') => {
    console.log(`[RadioTranscriptionSlot] View mode changed to ${mode}`);
    setViewMode(mode);
  };

  const handleTimestampClick = (timestamp: number) => {
    if (onTimestampClick) {
      // Create a temporary segment object for the timestamp
      const tempSegment: RadioNewsSegment = {
        headline: "Timestamp",
        text: "",
        startTime: timestamp,
        end: timestamp + 1000,
        keywords: []
      };
      onTimestampClick(tempSegment);
    } else if (onSeek) {
      onSeek(timestamp);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 w-full">
      <Card className="overflow-hidden w-full">
        <RadioTranscriptionMetadata metadata={metadata} onMetadataChange={onMetadataChange} />
        
        <div className="p-4 border-b">
          <ViewModeToggle 
            mode={viewMode}
            onChange={handleViewModeChange}
            hasUtterances={hasUtterances}
          />
        </div>

        <CardContent className="p-4 space-y-4">
          {viewMode === 'interactive' && hasUtterances ? (
            <InteractiveTranscription
              transcriptionResult={transcriptionResult}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onPlayPause={onPlayPause}
              onSeek={handleTimestampClick}
            />
          ) : (
            <RadioTranscriptionEditor
              transcriptionText={transcriptionText}
              isProcessing={isProcessing}
              onTranscriptionChange={onTranscriptionChange}
              transcriptionId={transcriptionId}
              transcriptionResult={transcriptionResult}
              onTimestampClick={handleTimestampClick}
              registerReset={handleRegisterReset}
            />
          )}
          
          <div className="flex justify-end">
            <RadioReportButton
              transcriptionText={transcriptionText}
              metadata={metadata}
              isProcessing={isProcessing}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RadioTranscriptionSlot;
