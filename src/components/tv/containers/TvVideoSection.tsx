
import React, { useState } from "react";
import VideoUploadSection from "../VideoUploadSection";
import VideoPreview from "@/components/video/VideoPreview";

interface UploadedFile extends File {
  preview?: string;
}

interface TvVideoSectionProps {
  uploadedFiles: UploadedFile[];
  setUploadedFiles: (files: UploadedFile[]) => void;
  isPlaying: boolean;
  volume: number[];
  isProcessing: boolean;
  progress: number;
  onTogglePlayback: () => void;
  onVolumeChange: (value: number[]) => void;
  onProcess: (file: UploadedFile) => void;
  onTranscriptionComplete: (text: string) => void;
  onRemoveFile: (index: number) => void;
  isActiveMediaRoute?: boolean;
  registerVideoElement?: (element: HTMLVideoElement | null) => void;
}

const TvVideoSection = ({
  uploadedFiles,
  setUploadedFiles,
  isPlaying,
  volume,
  isProcessing,
  progress,
  onTogglePlayback,
  onVolumeChange,
  onProcess,
  onTranscriptionComplete,
  onRemoveFile,
  isActiveMediaRoute = true,
  registerVideoElement
}: TvVideoSectionProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFilesUploaded = (newFiles: File[]) => {
    setUploadedFiles([...uploadedFiles, ...newFiles] as UploadedFile[]);
  };

  return (
    <div className="grid gap-8 xl:grid-cols-2 w-full">
      <VideoUploadSection
        isDragging={isDragging}
        setIsDragging={setIsDragging}
        onFilesUploaded={handleFilesUploaded}
      />
      <VideoPreview
        uploadedFiles={uploadedFiles}
        isPlaying={isPlaying}
        volume={volume}
        isProcessing={isProcessing}
        progress={progress}
        onTogglePlayback={onTogglePlayback}
        onVolumeChange={onVolumeChange}
        onProcess={onProcess}
        onTranscriptionComplete={onTranscriptionComplete}
        onRemoveFile={onRemoveFile}
        isActiveMediaRoute={isActiveMediaRoute}
        registerVideoElement={registerVideoElement}
      />
    </div>
  );
};

// Memoize to prevent unnecessary re-renders from parent
export default React.memo(TvVideoSection, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  const filesEqual = 
    prevProps.uploadedFiles.length === nextProps.uploadedFiles.length &&
    prevProps.uploadedFiles.every((file, idx) => {
      const prevId = (file as any)._fileId || (file as any).filePath || (file as any).preview;
      const nextId = (nextProps.uploadedFiles[idx] as any)._fileId || (nextProps.uploadedFiles[idx] as any).filePath || (nextProps.uploadedFiles[idx] as any).preview;
      return prevId === nextId;
    });
  
  return (
    filesEqual &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isProcessing === nextProps.isProcessing &&
    prevProps.progress === nextProps.progress &&
    JSON.stringify(prevProps.volume) === JSON.stringify(nextProps.volume)
  );
});
