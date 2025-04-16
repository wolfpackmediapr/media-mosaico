
import { Dispatch, SetStateAction } from "react";
import FileUploadSection from "../FileUploadSection";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface UploadedFile extends File {
  preview?: string;
}

interface RadioLeftSectionProps {
  files: UploadedFile[];
  setFiles: (files: UploadedFile[]) => void;
  currentFileIndex: number;
  setCurrentFileIndex: (index: number) => void;
  isProcessing: boolean;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
  progress: number;
  setProgress: Dispatch<SetStateAction<number>>;
  transcriptionText: string;
  setTranscriptionText: (text: string) => void;
  setTranscriptionId: (id?: string) => void;
  onTranscriptionComplete: (result: TranscriptionResult) => void;
  onFilesAdded: (newFiles: File[]) => void;
}

const RadioLeftSection = ({
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
  onTranscriptionComplete,
  onFilesAdded
}: RadioLeftSectionProps) => {
  return (
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
      onTranscriptionComplete={onTranscriptionComplete}
      onFilesAdded={onFilesAdded}
    />
  );
};

export default RadioLeftSection;
