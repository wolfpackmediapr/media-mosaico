import { FileAudio, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UploadedFile extends File {
  preview?: string;
  name: string;
  size: number;
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
  // Safely calculate file size in MB with additional error checking
  const getFileSize = (file: UploadedFile) => {
    try {
      if (typeof file.size !== 'number' || isNaN(file.size)) {
        console.error('Invalid file size:', file.size);
        return '0.00';
      }
      const sizeInMB = file.size / (1024 * 1024);
      return sizeInMB.toFixed(2);
    } catch (error) {
      console.error('Error calculating file size:', error);
      return '0.00';
    }
  };

  // Safely get file name with additional error checking
  const getFileName = (file: UploadedFile) => {
    try {
      if (!file.name || typeof file.name !== 'string') {
        console.error('Invalid file name:', file.name);
        return 'Unknown file';
      }
      return file.name;
    } catch (error) {
      console.error('Error getting file name:', error);
      return 'Unknown file';
    }
  };

  return (
    <div className="space-y-4 p-4 bg-muted rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileAudio className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">{getFileName(file)}</p>
            <p className="text-xs text-gray-500">
              {getFileSize(file)} MB
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