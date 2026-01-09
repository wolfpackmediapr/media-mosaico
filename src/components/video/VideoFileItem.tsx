
import { useEffect } from "react";
import { FileVideo, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EnhancedVideoPlayer } from "./EnhancedVideoPlayer";
import { getOriginalSize } from "@/hooks/tv/useFileCache";

interface UploadedFile extends File {
  preview?: string;
  filePath?: string;
  _fileId?: string;
  _originalSize?: number;
}

interface VideoFileItemProps {
  file: UploadedFile;
  index: number;
  isProcessing: boolean;
  progress: number;
  onProcess: (file: UploadedFile) => void;
  onRemove?: (index: number) => void;
  registerVideoElement?: (element: HTMLVideoElement | null) => void;
  isPlaying?: boolean;
}

const VideoFileItem = ({
  file,
  index,
  isProcessing,
  progress,
  onProcess,
  onRemove,
  registerVideoElement,
  isPlaying = false
}: VideoFileItemProps) => {
  // Phase 7: Diagnostic logging for component lifecycle
  useEffect(() => {
    console.log('[VideoFileItem] Mounted with file:', {
      name: file.name,
      hasPreview: !!file.preview,
      hasFilePath: !!file.filePath,
      _fileId: (file as any)._fileId
    });
    
    return () => {
      console.log('[VideoFileItem] Unmounting file:', file.name);
    };
  }, []);

  useEffect(() => {
    console.log('[VideoFileItem] File prop changed:', {
      name: file.name,
      hasPreview: !!file.preview,
      hasFilePath: !!file.filePath
    });
  }, [file]);

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
    if (progress < 60) return "Analizando contenido con IA";
    if (progress < 90) return "Generando transcripción y segmentos";
    return "Finalizando procesamiento";
  };

  // Get the display size - prefer cached original size, then _originalSize, then file.size
  const displaySize = (file._fileId && getOriginalSize(file._fileId)) 
    || file._originalSize 
    || file.size;

  return (
    <div className="space-y-4 p-4 bg-muted rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileVideo className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(displaySize / (1024 * 1024)).toFixed(2)} MB
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

      {(file.preview || file.filePath) && (
        <div className="relative mb-4">
          <EnhancedVideoPlayer 
            src={file.filePath || file.preview!} 
            key={(file as any)._fileId || `${file.name}-${file.size}-${file.lastModified}`}
            fileId={file._fileId}
            className="aspect-video min-h-64"
            registerVideoElement={registerVideoElement}
            isPlaying={isPlaying}
          />
        </div>
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
