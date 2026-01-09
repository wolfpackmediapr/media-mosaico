
import React, { useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import TvLayout from "../TvLayout";
import TvTopSection from "./TvTopSection";
import TvVideoSection from "./TvVideoSection";
import TvTranscriptionSection from "../TvTranscriptionSection";
import TvAnalysisSection from "../TvAnalysisSection";
import TvNotePadSection from "../TvNotePadSection";

import TvTypeformEmbed from "../TvTypeformEmbed";
import { NewsSegment, UploadedFile } from "@/types/media";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

// Re-export types for backward compatibility
export type { UploadedFile } from "@/types/media";

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
  registerVideoElement?: (element: HTMLVideoElement | null) => void;
  isRestoring?: boolean; // NEW: State restoration indicator
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
  analysisResults,
  registerVideoElement,
  isRestoring = false // NEW: Default to false for backward compatibility
}: TvMainContentProps) => {
  console.log('[TvMainContent] Component rendering with props:', {
    uploadedFiles: uploadedFiles?.length,
    transcriptionText: transcriptionText?.length,
    isProcessing,
    isRestoring
  });
  
  const clearAnalysisFnRef = useRef<(() => void) | null>(null);
  const clearEditorFnRef = useRef<(() => void) | null>(null);

  const handleClearAnalysis = useCallback((clearFn: () => void) => {
    clearAnalysisFnRef.current = clearFn;
  }, []);

  const handleRegisterEditorReset = useCallback((resetFn: () => void) => {
    clearEditorFnRef.current = resetFn;
  }, []);

  // NEW: Show loading state while restoring session
  if (isRestoring) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Restaurando sesión...</p>
        </div>
      </div>
    );
  }

  // Define layout sections
  const topSection = (
    <TvTopSection
      handleClearAll={clearAllTvState}
      files={uploadedFiles}
      transcriptionText={transcriptionText}
      clearingProgress={clearingProgress}
      clearingStage={clearingStage}
      isProcessing={isProcessing}
      progress={progress}
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
      registerVideoElement={registerVideoElement}
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
