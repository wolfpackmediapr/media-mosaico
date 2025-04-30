
import React from 'react';
import AudioFileHeader from './AudioFileHeader';
import ProcessButton from './ProcessButton';
import ProgressIndicator from './ProgressIndicator';

interface UploadedFile extends File {
  preview?: string;
  remoteUrl?: string;
  storagePath?: string;
  isUploaded?: boolean;
}

export interface AudioFileItemProps {
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
  const [processingComplete, setProcessingComplete] = React.useState(false);
  const [showPlayer, setShowPlayer] = React.useState(false);

  const handleProcess = async () => {
    if (isProcessing || processingComplete) return;
    
    if (setIsProcessing) setIsProcessing(true);
    
    try {
      await onProcess(file);
      setProcessingComplete(true);
    } finally {
      if (setIsProcessing) setIsProcessing(false);
    }
  };

  const handleRemove = () => {
    if (onRemove) onRemove(index);
  };

  const handleTogglePlayer = () => {
    setShowPlayer(prev => !prev);
  };

  // Audio source - use remote URL if available, otherwise use local preview
  const audioSrc = file.remoteUrl || file.preview;

  return (
    <div className="p-4 bg-muted rounded-lg space-y-4">
      <AudioFileHeader
        file={file}
        index={index}
        onRemove={handleRemove}
        onTogglePlayer={handleTogglePlayer}
      />
      
      {showPlayer && audioSrc && (
        <div className="mt-3">
          <audio
            controls
            src={audioSrc}
            className="w-full"
          />
        </div>
      )}
      
      <div className="space-y-2">
        <ProgressIndicator isProcessing={isProcessing} progress={progress} />
        
        <ProcessButton
          isProcessing={isProcessing}
          processingComplete={processingComplete}
          progress={progress}
          onProcess={handleProcess}
          isUploaded={!!file.isUploaded}
        />
      </div>
    </div>
  );
};

export default AudioFileItem;
