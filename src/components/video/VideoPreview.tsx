
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import VideoFileItem from "./VideoFileItem";

interface UploadedFile extends File {
  preview?: string;
}

interface VideoPreviewProps {
  uploadedFiles: UploadedFile[];
  isPlaying: boolean;
  volume: number[];
  isProcessing: boolean;
  progress: number;
  onTogglePlayback: () => void;
  onVolumeChange: (value: number[]) => void;
  onProcess: (file: UploadedFile) => void;
  onTranscriptionComplete?: (text: string) => void;
  onRemoveFile?: (index: number) => void;
  isActiveMediaRoute?: boolean;
  registerVideoElement?: (element: HTMLVideoElement | null) => void;
}

const VideoPreview = ({
  uploadedFiles,
  isPlaying,
  volume,
  isProcessing,
  progress,
  onTogglePlayback,
  onVolumeChange,
  onProcess,
  onTranscriptionComplete,
  onRemoveFile,
  isActiveMediaRoute = true,
  registerVideoElement
}: VideoPreviewProps) => {
  const handleProcess = (file: UploadedFile) => {
    onProcess(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Videos Subidos</CardTitle>
        <CardDescription>Lista de videos listos para procesar</CardDescription>
        {!isActiveMediaRoute && isPlaying && (
          <div className="mt-2 text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md">
            Este video se está reproduciendo en otra pestaña
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {uploadedFiles.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay videos subidos</p>
          ) : (
            uploadedFiles.map((file, index) => (
              <VideoFileItem
                key={index}
                file={file}
                index={index}
                isProcessing={isProcessing}
                progress={progress}
                onProcess={handleProcess}
                onRemove={onRemoveFile}
                registerVideoElement={registerVideoElement}
                isPlaying={isPlaying}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoPreview;
