import { FileMusic, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UploadedFile extends File {
  preview?: string;
}

interface AudioFileItemProps {
  file: UploadedFile;
  index: number;
  isProcessing: boolean;
  progress: number;
  onProcess: (file: UploadedFile) => void;
  onRemove?: (index: number) => void;
}

const AudioFileItem = ({
  file,
  index,
  isProcessing,
  progress,
  onProcess,
  onRemove,
}: AudioFileItemProps) => {
  return (
    <div className="space-y-4 p-4 bg-muted rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileMusic className="w-5 h-5" />
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

      {isProcessing && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-xs text-center text-gray-500">
            {progress === 100 ? 'Procesamiento completado' : `Procesando: ${progress}%`}
          </p>
        </div>
      )}

      <Button
        className="w-full"
        onClick={() => onProcess(file)}
        disabled={isProcessing}
      >
        {isProcessing ? 'Procesando...' : 'Procesar Transcripción'}
      </Button>
    </div>
  );
};

export default AudioFileItem;