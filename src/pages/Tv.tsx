import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import FileUploadZone from "@/components/upload/FileUploadZone";
import VideoPreview from "@/components/video/VideoPreview";
import TranscriptionSlot from "@/components/transcription/TranscriptionSlot";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface UploadedFile extends File {
  preview?: string;
}

interface TranscriptionMetadata {
  channel?: string;
  program?: string;
  category?: string;
  broadcastTime?: string;
  keywords?: string[];
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
const SUPABASE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB Supabase limit

const Tv = () => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([50]);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionMetadata, setTranscriptionMetadata] = useState<TranscriptionMetadata>();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [uploadedFiles]);

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

    if (file.size > SUPABASE_SIZE_LIMIT) {
      toast({
        title: "Error",
        description: "El archivo excede el límite de 50MB permitido por el servidor.",
        variant: "destructive",
      });
      return false;
    }

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
      setIsUploading(true);
      setUploadProgress(0);

      // Create a progress toast
      const progressToast = toast({
        title: "Subiendo archivo",
        description: (
          <div className="w-full">
            <Progress value={0} className="w-full h-2" />
            <p className="mt-2">Iniciando subida...</p>
          </div>
        ),
      });

      const options = {
        cacheControl: '3600',
        upsert: false,
      };

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file, options);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('transcriptions')
        .insert({
          user_id: user.id,
          original_file_path: fileName,
          status: file.size > MAX_FILE_SIZE ? 'needs_conversion' : 'pending',
          channel: 'Canal Example',
          program: 'Programa Example',
          category: 'Noticias',
          broadcast_time: new Date().toISOString(),
          keywords: ['ejemplo', 'prueba']
        });

      if (dbError) throw dbError;

      setIsUploading(false);
      setUploadProgress(100);

      toast({
        title: "Archivo subido exitosamente",
        description: file.size > MAX_FILE_SIZE 
          ? "El archivo será convertido a audio automáticamente."
          : "Listo para procesar la transcripción.",
      });

      // Create preview URL for the video
      const preview = URL.createObjectURL(file);
      setUploadedFiles(prev => [...prev, Object.assign(file, { preview })]);

      return true;
    } catch (error) {
      console.error('Error uploading file:', error);
      setIsUploading(false);
      toast({
        title: "Error al subir el archivo",
        description: error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleFiles = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      const success = await validateAndUploadFile(file);
      if (success) {
        // Create preview URL for the video
        const preview = URL.createObjectURL(file);
        setUploadedFiles(prev => [...prev, Object.assign(file, { preview })]);
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

    try {
      // Fetch the transcription metadata
      const { data: transcriptionData, error: transcriptionError } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('original_file_path', file.name)
        .single();

      if (transcriptionError) throw transcriptionError;

      setTranscriptionMetadata({
        channel: transcriptionData.channel,
        program: transcriptionData.program,
        category: transcriptionData.category,
        broadcastTime: transcriptionData.broadcast_time,
        keywords: transcriptionData.keywords,
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
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error al procesar",
        description: "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
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
          isUploading={isUploading}
          uploadProgress={uploadProgress}
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
        metadata={transcriptionMetadata}
        onTranscriptionChange={handleTranscriptionChange}
      />
    </div>
  );

};

export default Tv;
