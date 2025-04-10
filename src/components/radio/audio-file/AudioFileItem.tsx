
import React, { useState } from 'react';
import { AudioPlayer } from '../audio-player';
import { useAudioProcessingWithAuth } from '../AudioProcessing';
import AudioFileHeader from './AudioFileHeader';
import ProcessButton from './ProcessButton';
import ProgressIndicator from './ProgressIndicator';
import { AudioFileItemProps } from './types';

const AudioFileItem: React.FC<AudioFileItemProps> = ({
  file,
  index,
  onProcess,
  onTranscriptionComplete,
  onRemove,
  isProcessing = false,
  progress = 0,
  setIsProcessing,
  setProgress
}) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const processWithAuth = useAudioProcessingWithAuth();

  const handleTogglePlayer = () => {
    setShowPlayer(!showPlayer);
  };

  const handleProcess = async () => {
    if (setIsProcessing) setIsProcessing(true);
    if (setProgress) setProgress(10);
    
    try {
      const success = await processWithAuth(file, (text) => {
        onTranscriptionComplete?.(text);
        if (setProgress) setProgress(100);
        setProcessingComplete(true);
        
        onProcess(file);
      });
      
      if (!success) {
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

  return (
    <div className="space-y-4 p-4 bg-muted rounded-lg">
      <AudioFileHeader 
        file={file}
        index={index}
        onRemove={onRemove}
        onTogglePlayer={handleTogglePlayer}
      />

      {showPlayer && (
        <div className="mt-2 block">
          <AudioPlayer file={file} />
        </div>
      )}

      <div className="space-y-2">
        <ProgressIndicator 
          isProcessing={isProcessing} 
          progress={progress} 
        />
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
