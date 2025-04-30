
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
  isUploading?: boolean;
  uploadProgress?: number;
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
  setProgress,
  isUploading = false,
  uploadProgress = 0
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

  // Always use the most reliable audio source available
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
            key={audioSrc} // Force audio element to re-render when source changes
          />
        </div>
      )}
      
      <div className="space-y-2">
        <ProgressIndicator 
          isProcessing={isProcessing} 
          progress={progress}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
        
        <ProcessButton
          isProcessing={isProcessing}
          processingComplete={processingComplete}
          progress={progress}
          onProcess={handleProcess}
          isUploaded={!!file.isUploaded}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      </div>
    </div>
  );
};

export default AudioFileItem;
