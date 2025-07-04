
import { Card, CardContent } from "@/components/ui/card";
import React, { useEffect, useRef, useState, useCallback } from "react";
import RadioTranscriptionMetadata from "./RadioTranscriptionMetadata";
import RadioTranscriptionEditor from "./RadioTranscriptionEditor";
import RadioReportButton from "./RadioReportButton";
import TranscriptionCopyButton from "./editor/TranscriptionCopyButton";
import { RadioNewsSegment } from "./RadioNewsSegmentsContainer";
import { useRadioSegmentGenerator } from "@/hooks/radio/useRadioSegmentGenerator";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { InteractiveTranscription, ViewModeToggle } from "./interactive-transcription";
import { normalizeTimeToSeconds } from "./interactive-transcription/utils";

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
  registerEditorReset?: (fn: () => void) => void;
  isPlaying?: boolean;
  currentTime?: number;
  onPlayPause?: () => void;
  onSeek?: (timeOrSegment: number | RadioNewsSegment) => void;
}

const RadioTranscriptionSlot: React.FC<RadioTranscriptionSlotProps> = ({
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
  isPlaying = false,
  currentTime = 0,
  onPlayPause = () => {},
  onSeek = () => {},
}) => {
  const { checkAndGenerateSegments } = useRadioSegmentGenerator(onSegmentsReceived);
  const componentMountedRef = useRef(true);
  
  // Persistent view mode state with proper key
  const persistViewModeKey = `transcription-view-mode-${transcriptionId || "draft"}`;
  const [viewMode, setViewMode, removeViewMode] = usePersistentState<'interactive' | 'edit'>(
    persistViewModeKey,
    'edit',
    { storage: 'sessionStorage' }
  );

  const hasUtterances = useCallback(() => {
    return !!transcriptionResult?.utterances && 
           transcriptionResult.utterances.length > 0;
  }, [transcriptionResult?.utterances]);

  // Reset view mode to edit when transcription text is cleared
  useEffect(() => {
    if (!transcriptionText && viewMode !== 'edit') {
      console.log('[RadioTranscriptionSlot] Empty transcription text, resetting view mode to edit');
      setViewMode('edit');
    }
  }, [transcriptionText, viewMode, setViewMode]);

  // Reset functions management
  const resetFnRef = useRef<() => void>(() => {
    console.log('[RadioTranscriptionSlot] Execute fallback reset function');
    if (componentMountedRef.current) {
      removeViewMode();
      setViewMode('edit');
    }
  });
  
  const handleRegisterReset = useCallback((fn: () => void) => {
    resetFnRef.current = () => {
      console.log('[RadioTranscriptionSlot] Executing editor reset function');
      fn();
      
      // Also reset view mode
      if (componentMountedRef.current) {
        removeViewMode();
        setViewMode('edit');
      }
    };
    
    if (registerEditorReset) {
      registerEditorReset(resetFnRef.current);
    }
  }, [registerEditorReset, removeViewMode, setViewMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      componentMountedRef.current = false;
    };
  }, []);

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: 'interactive' | 'edit') => {
    setViewMode(mode);
  }, [setViewMode]);

  // Improved timestamp handling
  const handleTimestampClick = useCallback((timestamp: number) => {
    console.log(`[RadioTranscriptionSlot] Timestamp clicked: ${timestamp}`);
    
    // Always normalize timestamp to seconds for consistency
    const timeInSeconds = normalizeTimeToSeconds(timestamp);
    console.log(`[RadioTranscriptionSlot] Normalized timestamp: ${timeInSeconds}s`);
    
    if (onTimestampClick) {
      // Create a temporary segment object for the timestamp
      const tempSegment: RadioNewsSegment = {
        headline: "Timestamp",
        text: "",
        startTime: timeInSeconds * 1000, // Convert back to milliseconds for the segment
        end: timeInSeconds * 1000 + 1000, // Assume milliseconds for end time
        keywords: []
      };
      onTimestampClick(tempSegment);
    } else if (onSeek) {
      // Pass the normalized time in seconds directly to onSeek
      onSeek(timeInSeconds);
    }
  }, [onSeek, onTimestampClick]);

  return (
    <div className="space-y-4 md:space-y-6 w-full">
      <Card className="overflow-hidden w-full">
        <RadioTranscriptionMetadata 
          metadata={metadata} 
          onMetadataChange={onMetadataChange} 
        />
        
        <div className="p-4 border-b">
          <ViewModeToggle 
            mode={viewMode}
            onChange={handleViewModeChange}
            hasUtterances={hasUtterances()}
          />
        </div>

        <CardContent className="p-4 space-y-4">
          {viewMode === 'interactive' && hasUtterances() ? (
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
              currentTime={currentTime}
            />
          )}
          
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <TranscriptionCopyButton
              transcriptionText={transcriptionText}
              transcriptionResult={transcriptionResult}
              transcriptionId={transcriptionId}
              isProcessing={isProcessing}
            />
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

export default React.memo(RadioTranscriptionSlot);
