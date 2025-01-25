import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import VideoFileItem from "./VideoFileItem";
import { processVideoFile } from "./VideoProcessing";

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
}

const VideoPreview = ({
  uploadedFiles,
  isProcessing,
  progress,
  onProcess,
  onTranscriptionComplete,
  onRemoveFile,
}: VideoPreviewProps) => {
  const handleProcess = async (file: UploadedFile) => {
    await processVideoFile(file, onTranscriptionComplete);
    onProcess(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Videos Subidos</CardTitle>
        <CardDescription>Lista de videos listos para procesar</CardDescription>
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
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoPreview;