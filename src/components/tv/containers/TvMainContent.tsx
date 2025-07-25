
import React, { useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import TvLayout from "../TvLayout";
import TvTopSection from "./TvTopSection";
import TvVideoSection from "./TvVideoSection";
import TvTranscriptionSection from "../TvTranscriptionSection";
import TvAnalysisSection from "../TvAnalysisSection";
import TvNotePadSection from "../TvNotePadSection";

import TvTypeformEmbed from "../TvTypeformEmbed";
import { NewsSegment } from "@/hooks/use-video-processor";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface UploadedFile extends File {
  preview?: string;
}

interface TvMainContentProps {
  uploadedFiles: UploadedFile[];
  setUploadedFiles: (files: UploadedFile[]) => void;
  isPlaying: boolean;
  volume: number[];
  isProcessing: boolean;
  progress: number;
  transcriptionText: string;
  transcriptionMetadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
  };
  transcriptionResult?: TranscriptionResult;
  transcriptionId?: string;
  newsSegments: NewsSegment[];
  currentVideoPath?: string;
  onTogglePlayback: () => void;
  onVolumeChange: (value: number[]) => void;
  onProcess: (file: UploadedFile) => void;
  onTranscriptionComplete: (text: string) => void;
  onRemoveFile: (index: number) => void;
  onTranscriptionChange: (text: string) => void;
  onSeekToTimestamp: (timestamp: number) => void;
  onSegmentsReceived?: (segments: NewsSegment[]) => void;
  setNewsSegments: (segments: NewsSegment[]) => void;
  lastAction?: string | null;
  currentTime?: number;
  onPlayPause?: () => void;
  testAnalysis?: any;
  notepadContent: string;
  setNotepadContent: (content: string) => void;
  clearAllTvState: () => Promise<boolean>;
  clearingProgress?: number;
  clearingStage?: string;
  isClearing?: boolean;
  analysisResults?: string;
}

const TvMainContent = ({
  uploadedFiles,
  setUploadedFiles,
  isPlaying,
  volume,
  isProcessing,
  progress,
  transcriptionText,
  transcriptionMetadata,
  transcriptionResult,
  transcriptionId,
  newsSegments,
  currentVideoPath,
  onTogglePlayback,
  onVolumeChange,
  onProcess,
  onTranscriptionComplete,
  onRemoveFile,
  onTranscriptionChange,
  onSeekToTimestamp,
  onSegmentsReceived,
  setNewsSegments,
  lastAction,
  currentTime = 0,
  onPlayPause = () => {},
  testAnalysis,
  notepadContent,
  setNotepadContent,
  clearAllTvState,
  clearingProgress = 0,
  clearingStage = '',
  isClearing = false,
  analysisResults
}: TvMainContentProps) => {
  const clearAnalysisFnRef = useRef<(() => void) | null>(null);
  const clearEditorFnRef = useRef<(() => void) | null>(null);

  const handleClearAnalysis = useCallback((clearFn: () => void) => {
    clearAnalysisFnRef.current = clearFn;
  }, []);

  const handleRegisterEditorReset = useCallback((resetFn: () => void) => {
    clearEditorFnRef.current = resetFn;
  }, []);

  // Define layout sections
  const topSection = (
    <TvTopSection
      handleClearAll={clearAllTvState}
      files={uploadedFiles}
      transcriptionText={transcriptionText}
      clearingProgress={clearingProgress}
      clearingStage={clearingStage}
    />
  );

  const videoSection = (
    <TvVideoSection
      uploadedFiles={uploadedFiles || []}
      setUploadedFiles={setUploadedFiles}
      isPlaying={isPlaying}
      volume={volume}
      isProcessing={isProcessing}
      progress={progress}
      onTogglePlayback={onTogglePlayback}
      onVolumeChange={onVolumeChange}
      onProcess={onProcess}
      onTranscriptionComplete={onTranscriptionComplete}
      onRemoveFile={onRemoveFile}
    />
  );

  const transcriptionSection = (
    <TvTranscriptionSection
      textContent={transcriptionText}
      isProcessing={isProcessing}
      transcriptionMetadata={transcriptionMetadata}
      transcriptionResult={transcriptionResult}
      transcriptionId={transcriptionId}
      segments={newsSegments}
      notepadContent={notepadContent}
      onTranscriptionChange={onTranscriptionChange}
      onSeekToTimestamp={onSeekToTimestamp}
      onSegmentsReceived={onSegmentsReceived}
      registerEditorReset={handleRegisterEditorReset}
      isPlaying={isPlaying}
      currentTime={currentTime}
      onPlayPause={onPlayPause}
    />
  );

  const analysisSection = (transcriptionText || currentVideoPath || analysisResults) ? (
    <TvAnalysisSection
      transcriptionText={transcriptionText}
      transcriptionId={transcriptionId}
      transcriptionResult={transcriptionResult}
      videoPath={currentVideoPath}
      testAnalysis={testAnalysis}
      onClearAnalysis={handleClearAnalysis}
      lastAction={lastAction}
      onSegmentsGenerated={onSegmentsReceived}
      analysisResults={analysisResults}
    />
  ) : null;

  const notepadSection = (
    <TvNotePadSection
      content={notepadContent}
      onContentChange={setNotepadContent}
      segments={newsSegments}
      onSeekToTimestamp={onSeekToTimestamp}
    />
  );


  const typeformSection = <TvTypeformEmbed />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <TvLayout
        isAuthenticated={true}
        topSection={topSection}
        videoSection={videoSection}
        transcriptionSection={transcriptionSection}
        analysisSection={analysisSection}
        notepadSection={notepadSection}
        typeformSection={typeformSection}
      />
    </div>
  );
};

export default TvMainContent;
