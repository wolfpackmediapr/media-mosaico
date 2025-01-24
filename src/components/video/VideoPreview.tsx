import { Play, Pause, Volume2, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useRef, useEffect } from "react";

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
}: VideoPreviewProps) => {
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement }>({});

  useEffect(() => {
    Object.values(videoRefs.current).forEach(videoElement => {
      if (isPlaying) {
        videoElement.play();
      } else {
        videoElement.pause();
      }
    });
  }, [isPlaying]);

  useEffect(() => {
    Object.values(videoRefs.current).forEach(videoElement => {
      videoElement.volume = volume[0] / 100;
    });
  }, [volume]);

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
              <div key={index} className="space-y-4 p-4 bg-muted rounded-lg">
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
                  <Button size="icon" variant="ghost" onClick={onTogglePlayback}>
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                </div>

                {file.preview && (
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={el => {
                        if (el) videoRefs.current[index] = el;
                      }}
                      className="w-full h-full object-contain"
                      src={file.preview}
                      controls={false}
                      loop
                      playsInline
                      onClick={onTogglePlayback}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    <Slider value={volume} onValueChange={onVolumeChange} max={100} step={1} />
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
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoPreview;