
import React, { useState } from 'react';
import { FileAudio, Play, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAudioProcessingWithAuth } from './AudioProcessing';
import { AudioPlayer } from './AudioPlayer';

interface UploadedFile extends File {
  preview?: string;
}

interface AudioFileItemProps {
  file: UploadedFile;
  index: number;
  onProcess: (file: UploadedFile) => void;
  onTranscriptionComplete?: (text: string) => void;
  onRemove?: (index: number) => void;
  isProcessing?: boolean;
  progress?: number;
  setIsProcessing?: React.Dispatch<React.SetStateAction<boolean>>;
  setProgress?: React.Dispatch<React.SetStateAction<number>>;
}

const AudioFileItem = ({
  file,
  index,
  onProcess,
  onTranscriptionComplete,
  onRemove,
  isProcessing = false,
  progress = 0,
  setIsProcessing,
  setProgress
}: AudioFileItemProps) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const processWithAuth = useAudioProcessingWithAuth();

  const handleProcess = async () => {
    if (setIsProcessing) setIsProcessing(true);
    if (setProgress) setProgress(10);
    
    try {
      const success = await processWithAuth(file, (text) => {
        onTranscriptionComplete?.(text);
        if (setProgress) setProgress(100);
        setProcessingComplete(true);
        
        // Signal that processing is complete by calling onProcess
        onProcess(file);
      });
      
      if (!success) {
        // User was redirected to login
        if (setIsProcessing) setIsProcessing(false);
        if (setProgress) setProgress(0);
        return;
      }
      
      if (setProgress) setProgress(100);
    } catch (error) {
      console.error('Error processing audio:', error);
      if (setIsProcessing) setIsProcessing(false);
      if (setProgress) setProgress(0);
    }
  };

  const getButtonText = () => {
    if (!isProcessing && !processingComplete) return "Procesar Transcripción";
    if (processingComplete) return "Procesamiento completado";
    return `Procesando: ${progress}%`;
  };

  return (
    <div className="space-y-4 p-4 bg-muted rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileAudio className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-gray-500">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => setShowPlayer(!showPlayer)}
            title="Play/Preview Audio"
          >
            <Play className="w-4 h-4 text-primary" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => onRemove?.(index)}
            className="text-destructive hover:text-destructive/90"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showPlayer && (
        <div className="mt-2 block">
          <AudioPlayer file={file} />
        </div>
      )}

      <div className="space-y-2">
        {isProcessing && (
          <Progress value={progress} className="h-2" />
        )}
        <Button
          className="w-full relative"
          onClick={handleProcess}
          disabled={isProcessing || processingComplete}
          variant={processingComplete ? "secondary" : "default"}
        >
          {getButtonText()}
        </Button>
      </div>
    </div>
  );
};

export default AudioFileItem;
