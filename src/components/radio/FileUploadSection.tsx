
import { Dispatch, SetStateAction } from "react";
import FileUploadZone from "@/components/upload/FileUploadZone";
import AudioFileList from "./AudioFileList";
import { toast } from "sonner";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface UploadedFile extends File {
  preview?: string;
  id?: string;
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
  onRemoveFile?: (index: number) => void;
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
  onRemoveFile
}: FileUploadSectionProps) => {
  const { processWithAuth } = useAudioTranscription();

  // Validate that the file is usable
  const validateAudioFile = (file: File): boolean => {
    // Basic validation: file should exist and have size
    if (!file || !(file instanceof File) || file.size === 0) {
      return false;
    }
    return true;
  };

  const handleFilesAdded = (newFiles: File[]) => {
    if (!newFiles || newFiles.length === 0) {
      console.log('No files received in handleFilesAdded');
      return;
    }
    
    // Filter out files with zero size or invalid types
    const validFiles = newFiles.filter(file => {
      // Log info about the file for debugging
      console.log(`File received: ${file.name}, type: ${file.type || 'unknown'}, size: ${file.size}`);
      
      // Skip empty files
      if (!validateAudioFile(file)) {
        toast.error(`El archivo ${file.name} no es válido o está vacío`);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length === 0) {
      if (newFiles.length > 0) {
        toast.warning('No se encontraron archivos válidos');
      }
      return;
    }
    
    // Accept all valid files
    setFiles(validFiles);
    toast.success(`${validFiles.length} archivo(s) añadido(s)`);
  };

  const processFile = async (file: UploadedFile) => {
    if (!validateAudioFile(file)) {
      toast.error("Archivo inválido o vacío");
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Start progress simulation
      const intervalId = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(intervalId);
            return 95;
          }
          return prev + Math.random() * 10;
        });
      }, 1000);

      // Actual processing
      const transcriptionResult = await processWithAuth(file, (result) => {
        // This callback will be called when transcription is complete
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

      // Cleanup and finalize
      clearInterval(intervalId);
      setProgress(100);
      
      // Reset progress after a delay
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
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
        message="Arrastra y suelta archivos de audio o haz clic para seleccionarlos"
      />
      
      {files.length > 0 && (
        <AudioFileList
          uploadedFiles={files}
          onProcess={(file) => {
            processFile(file);
          }}
          onTranscriptionComplete={setTranscriptionText}
          onRemoveFile={onRemoveFile}
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
