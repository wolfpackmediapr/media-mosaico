
import { Card, CardContent } from "@/components/ui/card";
import React, { useEffect, useRef, useState, useCallback } from "react";
import RadioTranscriptionMetadata from "./RadioTranscriptionMetadata";
import RadioTranscriptionEditor from "./RadioTranscriptionEditor";
import InteractiveTranscription from "@/components/radio/interactive-transcription/InteractiveTranscription";
import ViewModeToggle from "@/components/radio/interactive-transcription/ViewModeToggle";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { normalizeTimeToSeconds } from "@/components/radio/interactive-transcription/utils";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";

interface RadioTranscriptionSlotProps {
  isProcessing: boolean;
  transcriptionText: string;
  transcriptionResult?: TranscriptionResult;
  transcriptionId?: string;
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    keywords?: string[];
  };
  onTranscriptionChange: (text: string) => void;
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void;
  onMetadataChange?: (metadata: {
    emisora: string;
    programa: string;
    horario: string;
  }) => void;
  onTimestampClick?: (timestamp: number) => void;
  registerEditorReset?: (fn: () => void) => void;
  isPlaying?: boolean;
  currentTime?: number;
  onPlayPause?: () => void;
  onSeek?: (time: number) => void;
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
  const componentMountedRef = useRef(true);
  
  // Persistent view mode state with proper key
  const persistViewModeKey = `radio-transcription-view-mode-${transcriptionId || "draft"}`;
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
  }, [removeViewMode, setViewMode]);

  // Register the reset function with parent only once
  useEffect(() => {
    if (registerEditorReset && resetFnRef.current) {
      registerEditorReset(resetFnRef.current);
    }
  }, [registerEditorReset]);

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

  // Improved timestamp handling for audio
  const handleTimestampClick = useCallback((timestamp: number) => {
    console.log(`[RadioTranscriptionSlot] Timestamp clicked: ${timestamp}`);
    
    // Always normalize timestamp to seconds for consistency
    const timeInSeconds = normalizeTimeToSeconds(timestamp);
    console.log(`[RadioTranscriptionSlot] Normalized timestamp: ${timeInSeconds}s`);
    
    if (onTimestampClick) {
      onTimestampClick(timeInSeconds);
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
              transcriptionId={transcriptionId}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(RadioTranscriptionSlot);
