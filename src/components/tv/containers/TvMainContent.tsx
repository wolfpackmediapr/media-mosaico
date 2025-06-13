
import React from "react";
import TvTopSection from "./TvTopSection";
import TvVideoSection from "./TvVideoSection";
import TvTranscriptionManager from "../transcription/TvTranscriptionManager";
import TvNotePadSection from "../TvNotePadSection";
import TvTypeformEmbed from "../TvTypeformEmbed";
import TvAnalysisSection from "../TvAnalysisSection";
import NewsSegmentsContainer from "@/components/transcription/NewsSegmentsContainer";
import { NewsSegment } from "@/hooks/tv/useTvVideoProcessor";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface UploadedFile extends File {
  preview?: string;
}

interface TvMainContentProps {
  // Top section props
  handleClearAll: () => Promise<boolean>;
  clearingProgress: number;
  clearingStage: string;
  
  // Video section props
  uploadedFiles: UploadedFile[];
  setUploadedFiles: (files: UploadedFile[]) => void;
  isPlaying: boolean;
  volume: number[];
  isProcessing: boolean;
  progress: number;
  togglePlayback: () => void;
  setVolume: (value: number[]) => void;
  processVideo: (file: UploadedFile) => void;
  handleTranscriptionComplete: (text: string) => void;
  handleRemoveFile: (index: number) => void;
  isActiveMediaRoute: boolean;
  
  // Transcription props
  textContent: string;
  transcriptionMetadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
  };
  transcriptionResult?: TranscriptionResult;
  transcriptionId?: string;
  handleTranscriptionChange: (text: string) => void;
  handleSeekToTimestamp: (timestamp: number) => void;
  handleEditorRegisterReset: (fn: () => void) => void;
  currentTime: number;
  
  // Notepad props
  notepadContent: string;
  setNotepadContent: (content: string) => void;
  isNotepadExpanded: boolean;
  setIsNotepadExpanded: (expanded: boolean) => void;
  
  // Analysis props
  testAnalysis: any;
  setClearAnalysis: (clearFn: () => void) => void;
  lastAction: string | null;
  
  // News segments props
  newsSegments: NewsSegment[];
  setNewsSegments: (segments: NewsSegment[]) => void;
}

const TvMainContent = ({
  handleClearAll,
  clearingProgress,
  clearingStage,
  uploadedFiles,
  setUploadedFiles,
  isPlaying,
  volume,
  isProcessing,
  progress,
  togglePlayback,
  setVolume,
  processVideo,
  handleTranscriptionComplete,
  handleRemoveFile,
  isActiveMediaRoute,
  textContent,
  transcriptionMetadata,
  transcriptionResult,
  transcriptionId,
  handleTranscriptionChange,
  handleSeekToTimestamp,
  setNewsSegments: onSegmentsReceived,
  handleEditorRegisterReset,
  currentTime,
  notepadContent,
  setNotepadContent,
  isNotepadExpanded,
  setIsNotepadExpanded,
  testAnalysis,
  setClearAnalysis,
  lastAction,
  newsSegments
}: TvMainContentProps) => {
  return (
    <div className="w-full space-y-6">
      {/* Top Section - Clear all controls */}
      <TvTopSection
        handleClearAll={handleClearAll}
        files={uploadedFiles}
        transcriptionText={textContent}
        clearingProgress={clearingProgress}
        clearingStage={clearingStage}
      />

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">MONITOREO TV</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Sube, transcribe y gestiona contenido de video de manera eficiente
        </p>
      </div>

      {/* Video Section - Upload and preview */}
      <TvVideoSection
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        isPlaying={isPlaying}
        volume={volume}
        isProcessing={isProcessing}
        progress={progress}
        onTogglePlayback={togglePlayback}
        onVolumeChange={setVolume}
        onProcess={processVideo}
        onTranscriptionComplete={handleTranscriptionComplete}
        onRemoveFile={handleRemoveFile}
        isActiveMediaRoute={isActiveMediaRoute}
      />

      {/* Transcription Section */}
      <TvTranscriptionManager
        textContent={textContent}
        isProcessing={isProcessing}
        transcriptionMetadata={transcriptionMetadata}
        transcriptionResult={transcriptionResult}
        transcriptionId={transcriptionId}
        onTranscriptionChange={handleTranscriptionChange}
        onSeekToTimestamp={handleSeekToTimestamp}
        onSegmentsReceived={onSegmentsReceived}
        registerEditorReset={handleEditorRegisterReset}
        isPlaying={isPlaying}
        currentTime={currentTime}
        onPlayPause={togglePlayback}
      />

      {/* Notepad Section */}
      <TvNotePadSection
        notepadContent={notepadContent}
        onNotepadContentChange={setNotepadContent}
        isExpanded={isNotepadExpanded}
        onExpandToggle={setIsNotepadExpanded}
      />

      {/* Typeform Embed */}
      <TvTypeformEmbed />

      {/* Analysis Section - only show when there's text */}
      {textContent && (
        <TvAnalysisSection
          transcriptionText={textContent}
          transcriptionId={transcriptionId}
          transcriptionResult={transcriptionResult}
          testAnalysis={testAnalysis}
          onClearAnalysis={setClearAnalysis}
          lastAction={lastAction}
          onSegmentsGenerated={onSegmentsReceived}
        />
      )}

      {/* News Segments Section */}
      {newsSegments && newsSegments.length > 0 && (
        <NewsSegmentsContainer
          segments={newsSegments}
          onSegmentsChange={onSegmentsReceived}
          onSeek={handleSeekToTimestamp}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
};

export default TvMainContent;
