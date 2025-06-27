
import React, { useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import TvVideoSection from "./TvVideoSection";
import TvTranscriptionSection from "../TvTranscriptionSection";
import TvAnalysisSection from "../TvAnalysisSection";
import TvNotePadSection from "../TvNotePadSection";
import TvReportButton from "../TvReportButton";
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
  setNotepadContent
}: TvMainContentProps) => {
  const clearAnalysisFnRef = useRef<(() => void) | null>(null);
  const clearEditorFnRef = useRef<(() => void) | null>(null);

  const handleClearAnalysis = useCallback((clearFn: () => void) => {
    clearAnalysisFnRef.current = clearFn;
  }, []);

  const handleRegisterEditorReset = useCallback((resetFn: () => void) => {
    clearEditorFnRef.current = resetFn;
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Video Upload and Preview Section */}
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

      {/* Two Column Layout for Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column - Transcription and Analysis */}
        <div className="space-y-6">
          {/* Transcription Section */}
          <TvTranscriptionSection
            textContent={transcriptionText}
            isProcessing={isProcessing}
            transcriptionMetadata={transcriptionMetadata}
            transcriptionResult={transcriptionResult}
            transcriptionId={transcriptionId}
            onTranscriptionChange={onTranscriptionChange}
            onSeekToTimestamp={onSeekToTimestamp}
            onSegmentsReceived={onSegmentsReceived}
            registerEditorReset={handleRegisterEditorReset}
            isPlaying={isPlaying}
            currentTime={currentTime}
            onPlayPause={onPlayPause}
          />

          {/* Analysis Section - Enhanced with video path support */}
          {(transcriptionText || currentVideoPath) && (
            <TvAnalysisSection
              transcriptionText={transcriptionText}
              transcriptionId={transcriptionId}
              transcriptionResult={transcriptionResult}
              videoPath={currentVideoPath}
              testAnalysis={testAnalysis}
              onClearAnalysis={handleClearAnalysis}
              lastAction={lastAction}
              onSegmentsGenerated={onSegmentsReceived}
            />
          )}
        </div>

        {/* Right Column - Notepad, Report, and TV Alert */}
        <div className="space-y-6">
          <TvNotePadSection
            content={notepadContent}
            onContentChange={setNotepadContent}
            segments={newsSegments}
            onSeekToTimestamp={onSeekToTimestamp}
          />
          
          <Card className="p-4">
            <TvReportButton 
              segments={newsSegments}
              transcriptionText={transcriptionText}
              notepadContent={notepadContent}
              metadata={transcriptionMetadata}
              isProcessing={isProcessing}
            />
          </Card>

          {/* TV Alert Section */}
          <TvTypeformEmbed />
        </div>
      </div>
    </div>
  );
};

export default TvMainContent;
