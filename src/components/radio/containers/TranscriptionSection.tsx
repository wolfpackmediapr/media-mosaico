
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioTranscriptionMetadata } from "@/components/radio/RadioTranscriptionMetadata";
import { RadioTranscriptionSlot } from "@/components/radio/RadioTranscriptionSlot";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { UtteranceTimestamp } from "@/hooks/useRealTimeTranscription";
import { RadioTranscriptionEditor } from "@/components/radio/RadioTranscriptionEditor";
import { RadioTimestampedTranscription } from "@/components/radio/RadioTimestampedTranscription";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useTranscriptionEditor } from "@/hooks/useTranscriptionEditor";
import ViewModeToggle from "@/components/radio/interactive-transcription/ViewModeToggle";
import InteractiveTranscription from "@/components/radio/interactive-transcription/InteractiveTranscription";
import { RealTimeTranscription } from "@/components/radio/RealTimeTranscription";

interface TranscriptionSectionProps {
  isProcessing: boolean;
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  metadata?: Record<string, any>;
  handleTranscriptionTextChange: (text: string) => void;
  handleSegmentsReceived: (segments: any[]) => void;
  handleMetadataChange: (metadata: Record<string, any>) => void;
  handleSeekToSegment: (timestamp: number) => void;
  registerEditorReset: (resetFn: () => void) => void;
  isPlaying: boolean;
  currentTime: number;
  onPlayPause: () => void;
}

const TranscriptionSection: React.FC<TranscriptionSectionProps> = ({
  isProcessing,
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  metadata,
  handleTranscriptionTextChange,
  handleSegmentsReceived,
  handleMetadataChange,
  handleSeekToSegment,
  registerEditorReset,
  isPlaying,
  currentTime,
  onPlayPause,
}) => {
  // Use persistent state for view modes
  const [viewMode, setViewMode] = usePersistentState(
    `transcription-view-mode-${transcriptionId || "draft"}`,
    "editor",
    { storage: 'sessionStorage' }
  );
  
  const [speakerViewMode, setSpeakerViewMode] = usePersistentState(
    `transcription-speaker-view-${transcriptionId || "draft"}`,
    "interactive",
    { storage: 'sessionStorage' }
  );

  const {
    localText,
    isEditing,
    isLoadingUtterances,
    handleTextChange,
    toggleEditMode,
    hasSpeakerLabels,
    resetLocalSpeakerText
  } = useTranscriptionEditor({
    transcriptionText,
    transcriptionId,
    transcriptionResult,
    onTranscriptionChange: handleTranscriptionTextChange,
  });

  // Register reset function
  useEffect(() => {
    registerEditorReset(resetLocalSpeakerText);
  }, [registerEditorReset, resetLocalSpeakerText]);

  // Handle utterances received from real-time processing
  const handleUtterancesReceived = (utterances: UtteranceTimestamp[]) => {
    if (transcriptionResult) {
      const updatedResult = {
        ...transcriptionResult,
        utterances
      };
      
      handleSegmentsReceived([]);
    }
  };

  return (
    <div className="w-full space-y-6">
      <RadioTranscriptionMetadata
        metadata={metadata}
        onMetadataChange={handleMetadataChange}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Transcripción</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
              <TabsList className="grid w-full sm:w-auto grid-cols-3">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="timestamped">Timestamped</TabsTrigger>
                <TabsTrigger value="realtime">Real-time</TabsTrigger>
              </TabsList>
              
              {viewMode === "editor" && hasSpeakerLabels && (
                <ViewModeToggle
                  mode={speakerViewMode as any}
                  onChange={(mode: any) => setSpeakerViewMode(mode)}
                  hasUtterances={hasSpeakerLabels}
                />
              )}
            </div>

            <TabsContent value="editor" className="mt-0">
              <RadioTranscriptionSlot isProcessing={isProcessing}>
                {speakerViewMode === "interactive" && hasSpeakerLabels ? (
                  <InteractiveTranscription
                    transcriptionResult={transcriptionResult}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    onPlayPause={onPlayPause}
                    onSeek={handleSeekToSegment}
                  />
                ) : (
                  <RadioTranscriptionEditor
                    value={localText}
                    onChange={handleTextChange}
                    isEditing={isEditing}
                    onToggleEditMode={toggleEditMode}
                    isLoading={isLoadingUtterances}
                  />
                )}
              </RadioTranscriptionSlot>
            </TabsContent>

            <TabsContent value="timestamped" className="mt-0">
              <RadioTimestampedTranscription
                transcriptionResult={transcriptionResult}
                transcriptionId={transcriptionId}
                onSeek={handleSeekToSegment}
              />
            </TabsContent>
            
            <TabsContent value="realtime" className="mt-0">
              <RealTimeTranscription
                transcriptionId={transcriptionId}
                onTranscriptionComplete={handleTranscriptionTextChange}
                onUtterancesReceived={handleUtterancesReceived}
                onSeek={handleSeekToSegment}
                isPlaying={isPlaying}
                currentTime={currentTime}
                onPlayPause={onPlayPause}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TranscriptionSection;
