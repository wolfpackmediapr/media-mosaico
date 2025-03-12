import { Dispatch, SetStateAction } from "react";
import FileUploadZone from "@/components/upload/FileUploadZone";
import AudioFileList from "./AudioFileList";
import { toast } from "sonner";

interface UploadedFile extends File {
  preview?: string;
}

interface FileUploadSectionProps {
  files: UploadedFile[];
  setFiles: Dispatch<SetStateAction<UploadedFile[]>>;
  currentFileIndex: number;
  setCurrentFileIndex: Dispatch<SetStateAction<number>>;
  isProcessing: boolean;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
  progress: number;
  setProgress: Dispatch<SetStateAction<number>>;
  transcriptionText: string;
  setTranscriptionText: Dispatch<SetStateAction<string>>;
  setTranscriptionId: Dispatch<SetStateAction<string | undefined>>;
}

const FileUploadSection = ({ 
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
  setTranscriptionId
}: FileUploadSectionProps) => {
  const handleFilesAdded = (newFiles: File[]) => {
    const audioFiles = newFiles.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length < newFiles.length) {
      toast.warning('Se omitieron algunos archivos que no son de audio');
    }

    const uploadedFiles = audioFiles.map((file) => {
      const uploadedFile = new File([file], file.name, { type: file.type });
      Object.defineProperty(uploadedFile, 'preview', {
        value: URL.createObjectURL(file),
        writable: true
      });
      return uploadedFile as UploadedFile;
    });
    setFiles((prevFiles) => [...prevFiles, ...uploadedFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => {
      const newFiles = [...prevFiles];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      if (currentFileIndex >= newFiles.length && currentFileIndex > 0) {
        setCurrentFileIndex(newFiles.length - 1);
      }
      return newFiles;
    });
  };

  return (
    <>
      <FileUploadZone
        isDragging={false}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files);
          handleFilesAdded(files);
        }}
        onFileInput={(e) => {
          const files = Array.from(e.target.files || []);
          handleFilesAdded(files);
        }}
        accept="audio/*"
        message="Arrastra y suelta archivos de audio o haz clic para seleccionarlos"
      />
      
      {files.length > 0 && (
        <AudioFileList
          files={files}
          currentFileIndex={currentFileIndex}
          setCurrentFileIndex={setCurrentFileIndex}
          isProcessing={isProcessing}
          progress={progress}
          handleRemoveFile={handleRemoveFile}
          setIsProcessing={setIsProcessing}
          setProgress={setProgress}
          setTranscriptionText={setTranscriptionText}
          setTranscriptionId={setTranscriptionId}
        />
      )}
    </>
  );
};

export default FileUploadSection;
