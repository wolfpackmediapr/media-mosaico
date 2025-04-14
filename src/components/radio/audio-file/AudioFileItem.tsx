
import React, { useState, useRef, useEffect } from 'react';
import ProcessButton from './ProcessButton';
import AudioFileHeader from './AudioFileHeader';
import ProgressIndicator from './ProgressIndicator';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { AudioFileItemProps } from './types';
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAudioSource } from '@/hooks/radio/audio-player/useAudioSource';

const AudioFileItem: React.FC<AudioFileItemProps> = ({
  file,
  index,
  onProcess,
  onTranscriptionComplete,
  onRemove,
  isProcessing = false,
  progress = 0,
  setIsProcessing,
  setProgress,
}) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { processWithAuth } = useAudioTranscription();
  const [loadingAudio, setLoadingAudio] = useState<boolean>(false);

  // Use our audio source hook for better file handling
  const { audioSource, isValid, url } = useAudioSource(file, {
    onError: (error) => {
      toast.error(error);
    }
  });

  const handleProcess = async () => {
    if (isProcessing || processingComplete) return;
    
    if (!file || !isValid) {
      toast.error("El archivo no es válido o está vacío");
      return;
    }
    
    try {
      if (setIsProcessing) setIsProcessing(true);
      
      // Create a simulation of progress for better UX
      const progressInterval = simulateProgressUpdates(setProgress);
      
      // Process the file
      const success = await processWithAuth(file, (result) => {
        // Extract the text from the TranscriptionResult object
        const text = result.text;
        
        // Pass the transcription text to the parent component
        onTranscriptionComplete?.(text);
        setProcessingComplete(true);
        clearInterval(progressInterval);
        if (setProgress) setProgress(100);
        
        // Show a toast notification that the text is ready for editing
        toast.success("Transcripción completada. Puede editar el texto.", {
          description: "Haga clic en el área de texto para editar la transcripción."
        });
      });
      
      if (!success) {
        clearInterval(progressInterval);
        if (setIsProcessing) setIsProcessing(false);
        if (setProgress) setProgress(0);
        return;
      }
      
      if (setProgress) setProgress(100);
    } catch (error) {
      console.error('Error processing file:', error);
      if (setIsProcessing) setIsProcessing(false);
      if (setProgress) setProgress(0);
      toast.error("Error procesando el archivo");
    }
  };
  
  const simulateProgressUpdates = (setProgressFn?: React.Dispatch<React.SetStateAction<number>>) => {
    if (!setProgressFn) return 0;
    
    let currentProgress = 0;
    return setInterval(() => {
      // Simulate exponential progress that never quite reaches 100%
      // until processing is actually complete
      const increment = Math.max(1, (95 - currentProgress) / 10);
      currentProgress = Math.min(95, currentProgress + increment);
      setProgressFn(currentProgress);
    }, 1000);
  };

  const handleTogglePlayer = () => {
    if (!isValid) {
      toast.error("No se puede reproducir el archivo de audio", {
        description: "Intente con otro formato o archivo"
      });
      return;
    }
    
    if (loadingAudio) {
      toast.info("Cargando audio, por favor espere...");
      return;
    }
    
    setShowPlayer(!showPlayer);
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card mb-4">
      <div className="p-3">
        <AudioFileHeader 
          file={file}
          index={index}
          onRemove={onRemove}
          onTogglePlayer={handleTogglePlayer}
          isLoading={loadingAudio}
          isInvalid={!isValid}
        />
      </div>
      
      {loadingAudio && showPlayer && (
        <div className="px-3 pb-3 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Cargando audio...</span>
        </div>
      )}
      
      {showPlayer && url && isValid && (
        <div className="px-3 pb-3">
          <audio 
            ref={audioRef}
            controls
            src={url} 
            className="w-full"
            onLoadStart={() => setLoadingAudio(true)}
            onCanPlay={() => setLoadingAudio(false)}
            onError={(e) => {
              console.error('Audio element error:', e);
              setLoadingAudio(false);
              toast.error("Error cargando el archivo de audio");
            }}
          />
        </div>
      )}
      
      {!isValid && showPlayer && (
        <div className="px-3 pb-3 text-center text-destructive">
          No se puede reproducir este archivo de audio
        </div>
      )}
      
      <ProgressIndicator 
        isProcessing={isProcessing} 
        progress={progress} 
      />
      
      <div className="p-3 pt-0">
        <ProcessButton 
          isProcessing={isProcessing} 
          processingComplete={processingComplete} 
          progress={progress}
          onProcess={handleProcess}
          disabled={!isValid}
        />
      </div>
    </div>
  );
};

export default AudioFileItem;
