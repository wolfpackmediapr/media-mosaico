import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import FileUploadZone from "@/components/upload/FileUploadZone";
import VideoPreview from "@/components/video/VideoPreview";
import TranscriptionSlot from "@/components/transcription/TranscriptionSlot";
import { supabase } from "@/integrations/supabase/client";

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

  const validateAndUploadFile = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Error",
        description: "Por favor, sube únicamente archivos de video.",
        variant: "destructive",
      });
      return false;
    }

    // Create a unique file path using the user's ID and timestamp
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para subir archivos.",
        variant: "destructive",
      });
      return false;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create transcription record
      const { error: dbError } = await supabase
        .from('transcriptions')
        .insert({
          user_id: user.id,
          original_file_path: fileName,
          status: file.size > MAX_FILE_SIZE ? 'needs_conversion' : 'pending',
        });

      if (dbError) throw dbError;

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Archivo grande detectado",
          description: "El archivo excede los 25MB. Se convertirá automáticamente a formato de audio para continuar con la transcripción.",
        });
      } else {
        toast({
          title: "Archivo cargado correctamente",
          description: "Listo para procesar la transcripción.",
        });
      }

      return true;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error al subir el archivo",
        description: "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleFiles = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      const success = await validateAndUploadFile(file);
      if (success) {
        const preview = URL.createObjectURL(file);
        setUploadedFiles((prev) => [...prev, Object.assign(file, { preview })]);
      }
    }
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

    toast({
      title: "Procesando archivo",
      description: "Transcribiendo archivo... Esto puede tardar unos momentos dependiendo del tamaño del archivo.",
    });

    // Simulate processing progress (will be replaced with actual processing)
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