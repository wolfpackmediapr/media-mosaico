import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FileUploadZone from "@/components/upload/FileUploadZone";
import TranscriptionSlot from "@/components/transcription/TranscriptionSlot";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useVideoProcessor } from "@/hooks/use-video-processor";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface UploadedFile extends File {
  preview?: string;
  url?: string;
}

const Radio = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { isUploading, uploadProgress, uploadFile } = useFileUpload();
  const {
    isProcessing,
    transcriptionText,
    transcriptionMetadata,
    processVideo,
    setTranscriptionText,
  } = useVideoProcessor();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//embed.typeform.com/next/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAudioFile = (file: File) => {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp3'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato no soportado",
        description: "Por favor, sube únicamente archivos de audio (MP3, WAV, M4A)",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "Archivo demasiado grande",
        description: "El archivo excede el límite de 25MB",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (!validateAudioFile(file)) continue;

      const result = await uploadFile(file);
      if (result) {
        const uploadedFile = Object.assign(file, { 
          preview: result.preview,
          url: URL.createObjectURL(file)
        });
        setUploadedFiles(prev => [...prev, uploadedFile]);
        await processVideo(file);
      }
    }
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

  const handleAudioSelect = (url: string) => {
    setCurrentAudio(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          MONITOREO RADIO
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Sube, transcribe y analiza segmentos de audio de programas radiales de manera eficiente
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <FileUploadZone
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onFileInput={handleFileInput}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />

          <Card>
            <CardHeader>
              <CardTitle>Archivos de Audio</CardTitle>
              <CardDescription>
                Lista de archivos de audio procesados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedFiles.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No hay archivos subidos aún
                </p>
              ) : (
                <ul className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                    >
                      <button
                        onClick={() => file.url && handleAudioSelect(file.url)}
                        className="flex-1 text-left hover:text-primary transition-colors"
                      >
                        <span className="text-sm truncate">{file.name}</span>
                      </button>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {currentAudio && (
            <Card>
              <CardContent className="p-4">
                <audio
                  controls
                  className="w-full"
                  src={currentAudio}
                  onEnded={() => setCurrentAudio(null)}
                >
                  Tu navegador no soporta el elemento de audio.
                </audio>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <TranscriptionSlot
            isProcessing={isProcessing}
            transcriptionText={transcriptionText}
            metadata={transcriptionMetadata}
            onTranscriptionChange={setTranscriptionText}
          />

          <Card className="p-4">
            <div 
              data-tf-live="01JEWES3GA7PPQN2SPRNHSVHPG"
              className="w-full min-h-[500px]"
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Radio;