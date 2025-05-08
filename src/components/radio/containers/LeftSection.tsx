
import React from "react";
import FileUploadSection from "../FileUploadSection";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface LeftSectionProps {
  files: File[];
  setFiles: (files: File[]) => void;
  currentFileIndex: number;
  setCurrentFileIndex: (index: number) => void;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  progress: number;
  setProgress: React.Dispatch<React.SetStateAction<number>>;
  transcriptionText: string;
  setTranscriptionText: (text: string) => void;
  setTranscriptionId: (id?: string) => void;
  handleTranscriptionReceived: (result: TranscriptionResult) => void;
  handleFilesAdded: (newFiles: File[]) => void;
  uploadProgress?: Record<string, number>;
  isUploading?: Record<string, boolean>;
  cancelUpload?: (fileName: string) => void;
}

const LeftSection = ({
  files,
  setFiles,
  currentFileIndex,
  setCurrentFileIndex,
  isProcessing,
  setIsProcessing,
  progress,
  setProgress,
  transcriptionText,
  setTranscriptionText,
  setTranscriptionId,
  handleTranscriptionReceived,
  handleFilesAdded,
  uploadProgress = {},
  isUploading = {},
  cancelUpload
}: LeftSectionProps) => (
  <FileUploadSection 
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
    onFilesAdded={handleFilesAdded}
    uploadProgress={uploadProgress}
    isUploading={isUploading}
    cancelUpload={cancelUpload}
  />
);

export default LeftSection;
