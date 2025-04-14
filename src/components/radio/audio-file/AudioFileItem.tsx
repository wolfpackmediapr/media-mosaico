
import React, { useState, useRef, useEffect } from 'react';
import ProcessButton from './ProcessButton';
import AudioFileHeader from './AudioFileHeader';
import ProgressIndicator from './ProgressIndicator';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { AudioFileItemProps } from './types';
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoadError, setAudioLoadError] = useState<boolean>(false);
  const [loadingAudio, setLoadingAudio] = useState<boolean>(false);

  // Enhanced file validation - allow all files that have size
  const isValidAudioFile = (fileToValidate: File): boolean => {
    if (!fileToValidate || !(fileToValidate instanceof File)) {
      console.error('Invalid file object provided:', fileToValidate);
      return false;
    }

    if (fileToValidate.size === 0) {
      console.error('File has zero size:', fileToValidate.name);
      return false;
    }

    // Consider all non-empty files as potentially valid
    return true;
  };

  // Create audio URL when component mounts or file changes
  useEffect(() => {
    // Clean up previous URL if it exists
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    
    setAudioLoadError(false);
    setLoadingAudio(true);
    
    // Only create a new URL if we have a valid file
    if (file && isValidAudioFile(file)) {
      try {
        console.log('Creating object URL for file:', file.name, file.type, file.size);
        const url = URL.createObjectURL(file);
        setAudioUrl(url);
        
        // Test if the audio is actually playable
        const audio = new Audio();
        
        // Add a timeout to detect if audio is taking too long to load
        const timeoutId = setTimeout(() => {
          console.warn('Audio loading timeout:', file.name);
          setLoadingAudio(false);
        }, 5000);
        
        audio.addEventListener('canplaythrough', () => {
          clearTimeout(timeoutId);
          setLoadingAudio(false);
          console.log('Audio can play through successfully');
        });
        
        audio.addEventListener('error', (e) => {
          clearTimeout(timeoutId);
          console.error('Error in test audio loading:', e);
          setAudioLoadError(true);
          setLoadingAudio(false);
          URL.revokeObjectURL(url);
          setAudioUrl(null);
          toast.error("No se puede reproducir el archivo de audio", {
            description: "El formato puede no ser compatible"
          });
        });
        
        audio.src = url;
      } catch (error) {
        console.error('Error creating object URL:', error);
        setAudioLoadError(true);
        setLoadingAudio(false);
        toast.error("No se pudo crear la vista previa del audio");
      }
    } else if (file) {
      console.warn('Invalid file provided:', {
        name: file.name,
        size: file.size,
        type: file.type || 'unknown'
      });
      setAudioLoadError(true);
      setLoadingAudio(false);
    }
    
    // Cleanup on unmount
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [file]);

  const handleProcess = async () => {
    if (isProcessing || processingComplete) return;
    
    if (!file || !isValidAudioFile(file)) {
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
    if (audioLoadError) {
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
    
    // If showing the player and we have an audio reference, play it
    if (!showPlayer && audioRef.current && audioUrl) {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        toast.error("Error reproduciendo el audio");
        setAudioLoadError(true);
      });
    }
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
          isInvalid={audioLoadError}
        />
      </div>
      
      {loadingAudio && showPlayer && (
        <div className="px-3 pb-3 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Cargando audio...</span>
        </div>
      )}
      
      {showPlayer && audioUrl && !audioLoadError && !loadingAudio && (
        <div className="px-3 pb-3">
          <audio 
            ref={audioRef}
            controls
            src={audioUrl} 
            className="w-full"
            onError={(e) => {
              console.error('Audio element error:', e);
              setAudioLoadError(true);
              toast.error("Error cargando el archivo de audio");
            }}
          />
        </div>
      )}
      
      {audioLoadError && showPlayer && (
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
          disabled={audioLoadError}
        />
      </div>
    </div>
  );
};

export default AudioFileItem;
