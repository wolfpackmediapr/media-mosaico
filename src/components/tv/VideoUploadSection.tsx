
import { useState } from "react";
import TvVideoUploader from "./TvVideoUploader";

interface VideoUploadSectionProps {
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  onFilesUploaded: (files: File[]) => void;
}

const VideoUploadSection = ({ 
  isDragging, 
  setIsDragging,
  onFilesUploaded 
}: VideoUploadSectionProps) => {
  return (
    <TvVideoUploader
      isDragging={isDragging}
      setIsDragging={setIsDragging}
      onFilesUploaded={onFilesUploaded}
    />
  );
};

export default VideoUploadSection;
