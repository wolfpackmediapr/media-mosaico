
import { useState } from "react";
import FileUploadZone from "@/components/upload/FileUploadZone";
import { useFileUpload } from "@/hooks/use-file-upload";

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
  const { isUploading, uploadProgress, uploadFile } = useFileUpload();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    const uploadedFiles: File[] = [];
    for (const file of Array.from(files)) {
      const result = await uploadFile(file);
      if (result) {
        const uploadedFile = Object.assign(file, { preview: result.preview });
        uploadedFiles.push(uploadedFile);
      }
    }
    if (uploadedFiles.length > 0) {
      onFilesUploaded(uploadedFiles);
    }
  };

  return (
    <FileUploadZone
      isDragging={isDragging}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onFileInput={handleFileInput}
      isUploading={isUploading}
      uploadProgress={uploadProgress}
    />
  );
};

export default VideoUploadSection;
