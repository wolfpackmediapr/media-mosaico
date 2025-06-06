
import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trash2, Play, Pause, Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import VideoPlayer from "./VideoPlayer";

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
  onTranscriptionComplete: (text: string) => void;
  onRemoveFile: (index: number) => void;
  isActiveMediaRoute?: boolean;
  // New props for video player integration
  currentTime?: number;
  seekToTime?: number;
  onTimeUpdate?: (time: number) => void;
  onSeek?: (time: number) => void;
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
  currentTime,
  seekToTime,
  onTimeUpdate,
  onSeek
}: VideoPreviewProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handlePlayPause = useCallback((playing: boolean) => {
    // Sync with parent playback state
    if (playing !== isPlaying) {
      onTogglePlayback();
    }
  }, [isPlaying, onTogglePlayback]);

  if (uploadedFiles.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Vista Previa de Video
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">
            No hay archivos seleccionados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Vista Previa de Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadedFiles.map((file, index) => (
          <div key={index} className="relative">
            <div
              className="relative group"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {file.preview && (
                <VideoPlayer
                  src={file.preview}
                  className="w-full rounded-lg"
                  title={file.name}
                  onTimeUpdate={onTimeUpdate}
                  onSeek={onSeek}
                  onPlayPause={handlePlayPause}
                  seekToTime={seekToTime}
                />
              )}

              {hoveredIndex === index && (
                <div className="absolute top-2 right-2 z-10">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onRemoveFile(index)}
                    className="h-8 w-8 bg-red-500/80 hover:bg-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">
                  {file.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-xs text-muted-foreground">
                    Procesando video... {progress}%
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => onProcess(file)}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? "Procesando..." : "Transcribir Video"}
                </Button>
              </div>

              {isActiveMediaRoute && (
                <div className="flex items-center gap-4 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onTogglePlayback}
                    className="flex-shrink-0"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>

                  <div className="flex items-center gap-2 flex-1">
                    <Volume2 className="h-4 w-4 flex-shrink-0" />
                    <Slider
                      value={volume}
                      onValueChange={onVolumeChange}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground min-w-[3ch]">
                      {volume[0]}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default VideoPreview;
