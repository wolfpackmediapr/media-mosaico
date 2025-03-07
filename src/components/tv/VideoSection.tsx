
import React from "react";
import FileUploadZone from "@/components/upload/FileUploadZone";
import VideoPreview from "@/components/video/VideoPreview";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useVideoProcessor } from "@/hooks/use-video-processor";

interface UploadedFile extends File {
  preview?: string;
}

interface VideoSectionProps {
  isDragging: boolean;
  uploadedFiles: UploadedFile[];
  isPlaying: boolean;
  volume: number[];
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTogglePlayback: () => void;
  onVolumeChange: (value: number[]) => void;
  onRemoveFile: (index: number) => void;
  onTranscriptionComplete: (text: string) => void;
  processVideo: (file: UploadedFile) => void;
}

const VideoSection = ({
  isDragging,
  uploadedFiles,
  isPlaying,
  volume,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
  onTogglePlayback,
  onVolumeChange,
  onRemoveFile,
  onTranscriptionComplete,
  processVideo
}: VideoSectionProps) => {
  const { isUploading, uploadProgress } = useFileUpload();
  const { isProcessing, progress } = useVideoProcessor();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <FileUploadZone
        isDragging={isDragging}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onFileInput={onFileInput}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
      />

      <VideoPreview
        uploadedFiles={uploadedFiles}
        isPlaying={isPlaying}
        volume={volume}
        isProcessing={isProcessing}
        progress={progress}
        onTogglePlayback={onTogglePlayback}
        onVolumeChange={onVolumeChange}
        onProcess={processVideo}
        onTranscriptionComplete={onTranscriptionComplete}
        onRemoveFile={onRemoveFile}
      />
    </div>
  );
};

export default VideoSection;
