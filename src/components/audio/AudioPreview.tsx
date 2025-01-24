import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Trash2 } from "lucide-react";

interface UploadedFile extends File {
  preview?: string;
}

interface AudioPreviewProps {
  uploadedFiles: UploadedFile[];
  isPlaying: boolean;
  volume: number[];
  isProcessing: boolean;
  progress: number;
  onTogglePlayback: () => void;
  onVolumeChange: (value: number[]) => void;
  onProcess: () => void;
  onTranscriptionComplete: (text: string) => void;
  onRemoveFile: (index: number) => void;
}

const AudioPreview: React.FC<AudioPreviewProps> = ({
  uploadedFiles,
  isPlaying,
  volume,
  isProcessing,
  progress,
  onTogglePlayback,
  onVolumeChange,
  onProcess,
  onRemoveFile,
}) => {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Audio Preview</h3>
        
        {uploadedFiles.map((file, index) => (
          <div key={index} className="flex items-center justify-between gap-4 p-2 border rounded">
            <span className="truncate flex-1">{file.name}</span>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onTogglePlayback}
                disabled={isProcessing}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <div className="w-24">
                <Slider
                  value={volume}
                  onValueChange={onVolumeChange}
                  max={100}
                  step={1}
                />
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveFile(index)}
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        
        {uploadedFiles.length > 0 && (
          <Button 
            onClick={onProcess}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? `Processing... ${progress}%` : 'Process Audio'}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default AudioPreview;