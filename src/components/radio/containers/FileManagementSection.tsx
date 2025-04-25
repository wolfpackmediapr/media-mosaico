
import React from 'react';
import { LeftSection, RightSection } from '.';
import { TranscriptionResult } from '@/services/audio/transcriptionService';

interface FileManagementSectionProps {
  files: File[];
  setFiles: (files: File[]) => void;
  currentFileIndex: number;
  setCurrentFileIndex: (index: number) => void;
  currentFile: File | null;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  progress: number;
  setProgress: React.Dispatch<React.SetStateAction<number>>;
  transcriptionText: string;
  setTranscriptionText: (text: string) => void;
  setTranscriptionId: (id?: string) => void;
  handleTranscriptionReceived: (result: TranscriptionResult) => void;
  handleFilesAdded: (newFiles: File[]) => void;
  metadata: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  };
  audioControls: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    isMuted: boolean;
    volume: number[];
    playbackRate: number;
    handlePlayPause: () => void;
    handleSeek: (time: number) => void;
    handleSkip: (direction: 'forward' | 'backward') => void;
    handleToggleMute: () => void;
    handleVolumeChange: (value: number[]) => void;
    handlePlaybackRateChange: () => void;
  };
}

const FileManagementSection = ({
  files,
  setFiles,
  currentFileIndex,
  setCurrentFileIndex,
  currentFile,
  isProcessing,
  setIsProcessing,
  progress,
  setProgress,
  transcriptionText,
  setTranscriptionText,
  setTranscriptionId,
  handleTranscriptionReceived,
  handleFilesAdded,
  metadata,
  audioControls
}: FileManagementSectionProps) => {
  const handleTrackSelect = (index: number) => {
    if (index !== currentFileIndex) {
      setCurrentFileIndex(index);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-1/2 min-w-0 flex-shrink-0">
        <LeftSection
          files={files}
          setFiles={setFiles}
          currentFileIndex={currentFileIndex}
          setCurrentFileIndex={setCurrentFileIndex}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          progress={progress}
          setProgress={setProgress}
          transcriptionText={transcriptionText}
          setTranscriptionText={setTranscriptionText}
          setTranscriptionId={setTranscriptionId}
          onTranscriptionComplete={handleTranscriptionReceived}
          handleFilesAdded={handleFilesAdded}
        />
      </div>
      <div className="w-full lg:w-1/2 min-w-0 flex-shrink-0">
        <RightSection
          currentFile={currentFile}
          metadata={metadata}
          files={files}
          currentFileIndex={currentFileIndex}
          isPlaying={audioControls.isPlaying}
          currentTime={audioControls.currentTime}
          duration={audioControls.duration}
          isMuted={audioControls.isMuted}
          volume={audioControls.volume}
          playbackRate={audioControls.playbackRate}
          onPlayPause={audioControls.handlePlayPause}
          onSeek={audioControls.handleSeek}
          onSkip={audioControls.handleSkip}
          onToggleMute={audioControls.handleToggleMute}
          onVolumeChange={audioControls.handleVolumeChange}
          onPlaybackRateChange={audioControls.handlePlaybackRateChange}
          handleTrackSelect={handleTrackSelect}
        />
      </div>
    </div>
  );
};

export default FileManagementSection;
