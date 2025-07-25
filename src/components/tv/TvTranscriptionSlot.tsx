import { Card, CardContent } from "@/components/ui/card";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import TvTranscriptionMetadata from "./TvTranscriptionMetadata";
import TvTranscriptionEditor from "./TvTranscriptionEditor";
import InteractiveTranscription from "@/components/radio/interactive-transcription/InteractiveTranscription";
import ViewModeToggle from "@/components/radio/interactive-transcription/ViewModeToggle";
import TranscriptionCopyButton from "@/components/radio/editor/TranscriptionCopyButton";
import TvReportButton from "./TvReportButton";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { normalizeTimeToSeconds } from "@/components/radio/interactive-transcription/utils";
import { NewsSegment } from "@/hooks/use-video-processor";
import { parseTvSpeakerText, hasTvSpeakerPatterns } from "@/utils/tv/speakerTextParser";

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
  segments?: NewsSegment[];
  notepadContent?: string;
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
  segments = [],
  notepadContent = "",
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
    // Check for structured utterances first
    if (transcriptionResult?.utterances && transcriptionResult.utterances.length > 0) {
      return true;
    }
    
    // Check for TV speaker-formatted text patterns
    return hasTvSpeakerPatterns(transcriptionText);
  }, [transcriptionResult?.utterances, transcriptionText]);

  // Create enhanced transcription result with parsed utterances for TV
  const enhancedTranscriptionResult = useMemo(() => {
    if (transcriptionResult?.utterances && transcriptionResult.utterances.length > 0) {
      return transcriptionResult;
    }
    
    // If we have speaker-formatted text but no utterances, parse them
    if (hasTvSpeakerPatterns(transcriptionText)) {
      const parsedUtterances = parseTvSpeakerText(transcriptionText);
      return {
        ...transcriptionResult,
        text: transcriptionText,
        utterances: parsedUtterances
      } as TranscriptionResult;
    }
    
    return transcriptionResult;
  }, [transcriptionResult, transcriptionText]);

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
          <ViewModeToggle 
            mode={viewMode}
            onChange={handleViewModeChange}
            hasUtterances={hasUtterances()}
          />
        </div>

        <CardContent className="p-4 space-y-4">
          {viewMode === 'interactive' && hasUtterances() ? (
            <InteractiveTranscription
              transcriptionResult={enhancedTranscriptionResult}
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
              transcriptionResult={enhancedTranscriptionResult}
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
            <TvReportButton
              segments={segments}
              transcriptionText={transcriptionText}
              notepadContent={notepadContent}
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