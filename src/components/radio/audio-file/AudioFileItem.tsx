
import React, { useState, useRef } from 'react';
import ProcessButton from './ProcessButton';
import AudioFileHeader from './AudioFileHeader';
import ProgressIndicator from './ProgressIndicator';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { AudioFileItemProps } from './types';
import { toast } from "sonner";

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

  // Create audio URL when component mounts or file changes
  React.useEffect(() => {
    // Clean up previous URL if it exists
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    
    // Only create a new URL if we have a valid File object
    if (file && file instanceof File && file.size > 0) {
      try {
        const url = URL.createObjectURL(file);
        setAudioUrl(url);
      } catch (error) {
        console.error('Error creating object URL:', error);
      }
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
      }
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
    setShowPlayer(!showPlayer);
    
    // If showing the player and we have an audio reference, play it
    if (!showPlayer && audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
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
        />
      </div>
      
      {showPlayer && audioUrl && (
        <div className="px-3 pb-3">
          <audio 
            ref={audioRef}
            controls
            src={audioUrl} 
            className="w-full" 
          />
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
        />
      </div>
    </div>
  );
};

export default AudioFileItem;
