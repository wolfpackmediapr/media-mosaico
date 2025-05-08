
import { Dispatch, SetStateAction } from "react";
import FileUploadZone from "@/components/upload/FileUploadZone";
import AudioFileList from "./AudioFileList";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useFileUploadHandlers } from "./useFileUploadHandlers";
import { UploadedFile } from "./types";
import { toast } from "sonner";

interface FileUploadSectionProps {
  files: UploadedFile[];
  currentFileIndex: number;
  isProcessing: boolean;
  progress: number;
  transcriptionText: string;
  setFiles: (files: UploadedFile[]) => void;
  setCurrentFileIndex: (index: number) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setProgress: Dispatch<SetStateAction<number>>;
  setTranscriptionText: (text: string) => void;
  setTranscriptionId?: (id?: string) => void;
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  onFilesAdded?: (newFiles: File[]) => void;
  uploadProgress?: Record<string, number>;
  isUploading?: Record<string, boolean>;
  cancelUpload?: (fileName: string) => void;
}

const FileUploadSection = ({
  files,
  currentFileIndex,
  isProcessing,
  progress,
  transcriptionText,
  setFiles,
  setCurrentFileIndex,
  setIsProcessing,
  setProgress,
  setTranscriptionText,
  setTranscriptionId,
  onTranscriptionComplete,
  onFilesAdded,
  uploadProgress = {},
  isUploading = {},
  cancelUpload
}: FileUploadSectionProps) => {
  const { processWithAuth } = useAudioTranscription();

  const { handleFilesAdded, handleRemoveFile } = useFileUploadHandlers({
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex
  });

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      (onFilesAdded ? onFilesAdded : handleFilesAdded)(filesArr);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const filesArr = Array.from(e.dataTransfer.files);
    (onFilesAdded ? onFilesAdded : handleFilesAdded)(filesArr);
  };

  const processFile = async (file: UploadedFile) => {
    if (!file) return null;
    setIsProcessing(true);
    setProgress(0);
    try {
      const intervalId = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(intervalId);
            return 95;
          }
          return prev + Math.random() * 5;
        });
      }, 1000);
      const transcriptionResult = await processWithAuth(file, (result) => {
        if (result?.text) setTranscriptionText(result.text);
        if (result?.transcript_id) setTranscriptionId?.(result.transcript_id);
        if (onTranscriptionComplete) onTranscriptionComplete(result);
      });
      clearInterval(intervalId);
      setProgress(100);
      setTimeout(() => setProgress(0), 1000);
      return transcriptionResult;
    } catch (error) {
      console.error("[FileUploadSection] Error processing file:", error);
      toast.error("Error al procesar el archivo");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <FileUploadZone
        isDragging={false}
        onDragOver={(e) => { e.preventDefault(); }}
        onDragLeave={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onFileInput={handleFileInput}
        accept="audio/*"
        message="Arrastra y suelta archivos de audio o haz clic para seleccionarlos"
      />
      {files.length > 0 && (
        <AudioFileList
          uploadedFiles={files}
          onProcess={processFile}
          onTranscriptionComplete={setTranscriptionText}
          onRemoveFile={handleRemoveFile}
          currentFileIndex={currentFileIndex}
          setCurrentFileIndex={setCurrentFileIndex}
          isProcessing={isProcessing}
          progress={progress}
          setIsProcessing={setIsProcessing}
          setProgress={setProgress}
          setTranscriptionId={setTranscriptionId}
          uploadProgress={uploadProgress}
          isUploading={isUploading}
          cancelUpload={cancelUpload}
        />
      )}
    </>
  );
};

export default FileUploadSection;
