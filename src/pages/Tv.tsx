import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import FileUploadZone from "@/components/upload/FileUploadZone";
import VideoPreview from "@/components/video/VideoPreview";
import TranscriptionSlot from "@/components/transcription/TranscriptionSlot";

interface UploadedFile extends File {
  preview?: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes

const Tv = () => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([50]);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState("");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Error",
        description: "Por favor, sube únicamente archivos de video.",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Archivo grande detectado",
        description: "El archivo excede el tamaño permitido. Convertiendo a formato MP3 para continuar...",
      });
    } else {
      toast({
        title: "Archivo cargado correctamente",
        description: "Listo para procesar con transcripción.",
      });
    }

    return true;
  };

  const handleFiles = useCallback((files: FileList) => {
    const validFiles = Array.from(files).filter(validateFile);

    const filesWithPreviews = validFiles.map((file) => {
      const preview = URL.createObjectURL(file);
      return Object.assign(file, { preview });
    });

    setUploadedFiles((prev) => [...prev, ...filesWithPreviews]);
  }, []);

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

  const handleProcess = async (file: UploadedFile) => {
    setIsProcessing(true);
    setProgress(0);

    // Simulate processing progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          setTranscriptionText("Esta es una transcripción de ejemplo del video procesado...");
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    toast({
      title: "Procesando archivo",
      description: "Transcribiendo archivo... Esto puede tardar unos momentos dependiendo del tamaño del archivo.",
    });
  };

  const handleTranscriptionChange = (text: string) => {
    setTranscriptionText(text);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">MONITOREO TV</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Sube, transcribe y gestiona contenido de video de manera eficiente
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FileUploadZone
          isDragging={isDragging}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileInput={handleFileInput}
        />

        <VideoPreview
          uploadedFiles={uploadedFiles}
          isPlaying={isPlaying}
          volume={volume}
          isProcessing={isProcessing}
          progress={progress}
          onTogglePlayback={togglePlayback}
          onVolumeChange={setVolume}
          onProcess={handleProcess}
        />
      </div>

      <TranscriptionSlot
        isProcessing={isProcessing}
        transcriptionText={transcriptionText}
        onTranscriptionChange={handleTranscriptionChange}
      />
    </div>
  );
};

export default Tv;