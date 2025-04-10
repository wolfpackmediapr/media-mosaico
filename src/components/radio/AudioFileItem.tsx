
import React, { useState } from 'react';
import { FileAudio, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAudioProcessingWithAuth } from './AudioProcessing';

interface UploadedFile extends File {
  preview?: string;
}

interface AudioFileItemProps {
  file: UploadedFile;
  index: number;
  onProcess: (file: UploadedFile) => void;
  onTranscriptionComplete?: (text: string) => void;
  onRemove?: (index: number) => void;
}

const AudioFileItem = ({
  file,
  index,
  onProcess,
  onTranscriptionComplete,
  onRemove,
}: AudioFileItemProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const processWithAuth = useAudioProcessingWithAuth();

  const handleProcess = async () => {
    setIsProcessing(true);
    setProgress(10);
    
    try {
      setProgress(30);
      const success = await processWithAuth(file, (text) => {
        onTranscriptionComplete?.(text);
        setProgress(100);
        
        // Signal that processing is complete by calling onProcess
        onProcess(file);
      });
      
      if (!success) {
        // User was redirected to login
        setIsProcessing(false);
        setProgress(0);
        return;
      }
      
      setProgress(100);
    } catch (error) {
      console.error('Error processing audio:', error);
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const getButtonText = () => {
    if (!isProcessing) return "Procesar Transcripción";
    if (progress === 100) return "Procesamiento completado";
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
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => onRemove?.(index)}
          className="text-destructive hover:text-destructive/90"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {isProcessing && (
          <Progress value={progress} className="h-2" />
        )}
        <Button
          className="w-full relative"
          onClick={handleProcess}
          disabled={isProcessing}
          variant={progress === 100 ? "secondary" : "default"}
        >
          {getButtonText()}
        </Button>
      </div>
    </div>
  );
};

export default AudioFileItem;
