import { Dispatch, SetStateAction } from "react";
import FileUploadZone from "@/components/upload/FileUploadZone";
import AudioFileList from "./AudioFileList";
import { toast } from "sonner";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface UploadedFile extends File {
  preview?: string;
}

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
  onFilesAdded
}: FileUploadSectionProps) => {
  const { processWithAuth } = useAudioTranscription();

  const handleFilesAdded = (newFiles: File[]) => {
    if (onFilesAdded) {
      onFilesAdded(newFiles);
    } else {
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
      
      setFiles([...files, ...uploadedFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = [...files];
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview!);
    }
    newFiles.splice(index, 1);
    
    setFiles(newFiles);
    
    if (currentFileIndex >= newFiles.length && currentFileIndex > 0) {
      setCurrentFileIndex(newFiles.length - 1);
    }
  };

  const processFile = async (file: UploadedFile) => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const intervalId = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(intervalId);
            return 95;
          }
          return prev + Math.random() * 10;
        });
      }, 1000);

      const transcriptionResult = await processWithAuth(file, (result) => {
        if (result?.text) {
          setTranscriptionText(result.text);
        }
        
        if (result?.transcript_id) {
          setTranscriptionId?.(result.transcript_id);
        }
        
        if (onTranscriptionComplete) {
          onTranscriptionComplete(result);
        }
      });

      clearInterval(intervalId);
      setProgress(100);
      
      setTimeout(() => setProgress(0), 1000);
      
      return transcriptionResult;
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Error al procesar el archivo");
    } finally {
      setIsProcessing(false);
    }
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
          uploadedFiles={files}
          onProcess={(file) => {
            processFile(file);
          }}
          onTranscriptionComplete={setTranscriptionText}
          onRemoveFile={handleRemoveFile}
          currentFileIndex={currentFileIndex}
          setCurrentFileIndex={setCurrentFileIndex}
          isProcessing={isProcessing}
          progress={progress}
          setIsProcessing={setIsProcessing}
          setProgress={setProgress}
          setTranscriptionId={setTranscriptionId}
        />
      )}
    </>
  );
};

export default FileUploadSection;
