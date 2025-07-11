
import { useState } from "react";
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
  isActiveMediaRoute = true
}: TvVideoSectionProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFilesUploaded = (newFiles: File[]) => {
    setUploadedFiles([...uploadedFiles, ...newFiles] as UploadedFile[]);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 w-full">
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
      />
    </div>
  );
};

export default TvVideoSection;
