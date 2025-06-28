
import { FileVideo, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import VideoPlayer from "./VideoPlayer";

interface UploadedFile extends File {
  preview?: string;
  filePath?: string;
}

interface VideoFileItemProps {
  file: UploadedFile;
  index: number;
  isProcessing: boolean;
  progress: number;
  onProcess: (file: UploadedFile) => void;
  onRemove?: (index: number) => void;
}

const VideoFileItem = ({
  file,
  index,
  isProcessing,
  progress,
  onProcess,
  onRemove,
}: VideoFileItemProps) => {
  const getButtonText = () => {
    if (!isProcessing) return "Procesar Video";
    if (progress < 15) return "Subiendo video...";
    if (progress < 30) return "Preparando análisis...";
    if (progress < 60) return "Procesando con IA...";
    if (progress < 90) return "Generando resultados...";
    if (progress === 100) return "¡Procesamiento completado!";
    return `Procesando: ${progress}%`;
  };

  const getProgressDescription = () => {
    if (progress < 15) return "Subiendo archivo al servidor";
    if (progress < 30) return "Validando y preparando video";
    if (progress < 60) return "Analizando contenido con Gemini AI";
    if (progress < 90) return "Generando transcripción y segmentos";
    return "Finalizando procesamiento";
  };

  return (
    <div className="space-y-4 p-4 bg-muted rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileVideo className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-gray-500">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        </div>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => onRemove?.(index)}
          className="text-destructive hover:text-destructive/90"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {file.preview && (
        <VideoPlayer src={file.preview} />
      )}

      <div className="space-y-2">
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {getProgressDescription()}
            </p>
          </div>
        )}
        <Button
          className="w-full relative"
          onClick={() => onProcess(file)}
          disabled={isProcessing}
          variant={progress === 100 ? "secondary" : "default"}
        >
          {getButtonText()}
        </Button>
      </div>
    </div>
  );
};

export default VideoFileItem;
