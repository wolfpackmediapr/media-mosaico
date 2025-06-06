
import { Card, CardContent } from "@/components/ui/card";
import React, { useEffect, useRef, useState, useCallback } from "react";
import TvTranscriptionMetadata from "./TvTranscriptionMetadata";
import TvTranscriptionEditor from "./TvTranscriptionEditor";
import TvReportButton from "./TvReportButton";
import TvInteractiveTranscription from "./TvInteractiveTranscription";
import { TvViewModeToggle } from "./interactive-transcription/TvViewModeToggle";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { normalizeTimeToSeconds } from "@/components/radio/interactive-transcription/utils";
import { NewsSegment } from "@/hooks/use-video-processor";

interface TvTranscriptionSlotProps {
  isProcessing: boolean;
  transcriptionText: string;
  transcriptionResult?: TranscriptionResult;
  transcriptionId?: string;
  metadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
    keywords?: string[];
  };
  onTranscriptionChange: (text: string) => void;
  onSegmentsReceived?: (segments: NewsSegment[]) => void;
  onMetadataChange?: (metadata: {
    channel: string;
    program: string;
    category: string;
    broadcastTime: string;
  }) => void;
  onTimestampClick?: (timestamp: number) => void;
  registerEditorReset?: (fn: () => void) => void;
  isPlaying?: boolean;
  currentTime?: number;
  onPlayPause?: () => void;
  onSeek?: (time: number) => void;
}

const TvTranscriptionSlot: React.FC<TvTranscriptionSlotProps> = ({
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
  const persistViewModeKey = `tv-transcription-view-mode-${transcriptionId || "draft"}`;
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
      console.log('[TvTranscriptionSlot] Empty transcription text, resetting view mode to edit');
      setViewMode('edit');
    }
  }, [transcriptionText, viewMode, setViewMode]);

  // Reset functions management
  const resetFnRef = useRef<() => void>(() => {
    console.log('[TvTranscriptionSlot] Execute fallback reset function');
    if (componentMountedRef.current) {
      removeViewMode();
      setViewMode('edit');
    }
  });
  
  const handleRegisterReset = useCallback((fn: () => void) => {
    resetFnRef.current = () => {
      console.log('[TvTranscriptionSlot] Executing editor reset function');
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

  // Improved timestamp handling for video
  const handleTimestampClick = useCallback((timestamp: number) => {
    console.log(`[TvTranscriptionSlot] Timestamp clicked: ${timestamp}`);
    
    // Always normalize timestamp to seconds for consistency
    const timeInSeconds = normalizeTimeToSeconds(timestamp);
    console.log(`[TvTranscriptionSlot] Normalized timestamp: ${timeInSeconds}s`);
    
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
        <TvTranscriptionMetadata 
          metadata={metadata} 
          onMetadataChange={onMetadataChange} 
        />
        
        <div className="p-4 border-b">
          <TvViewModeToggle 
            mode={viewMode}
            onChange={handleViewModeChange}
            hasUtterances={hasUtterances()}
          />
        </div>

        <CardContent className="p-4 space-y-4">
          {viewMode === 'interactive' && hasUtterances() ? (
            <TvInteractiveTranscription
              transcriptionResult={transcriptionResult}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onPlayPause={onPlayPause}
              onSeek={handleTimestampClick}
            />
          ) : (
            <TvTranscriptionEditor
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
          
          <div className="flex justify-end">
            <TvReportButton
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

export default React.memo(TvTranscriptionSlot);
