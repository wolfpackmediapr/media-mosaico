
import React from 'react';
import { UploadedFile } from '@/components/radio/types';
import AudioFileHeader from './AudioFileHeader';
import ProcessButton from './ProcessButton';
import ProgressIndicator from './ProgressIndicator';
import { TranscriptionResult } from '@/services/audio/transcriptionService';
import { getPlayableAudioUrl } from '@/utils/audio-url-validator';
import { Badge } from '@/components/ui/badge';
import { Cloud, CloudOff } from 'lucide-react';

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
  cancelUpload?: () => void;
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
  uploadProgress = 0,
  cancelUpload
}) => {
  const [processingComplete, setProcessingComplete] = React.useState(false);
  const [showPlayer, setShowPlayer] = React.useState(false);
  const [audioError, setAudioError] = React.useState<string | null>(null);

  const handleProcess = async () => {
    if (isProcessing || processingComplete) return;
    
    if (setIsProcessing) setIsProcessing(true);
    
    try {
      await onProcess(file);
      setProcessingComplete(true);
    } catch (err) {
      console.error("Error processing file:", err);
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
  
  const playableUrl = getPlayableAudioUrl(file);
  
  // Reset audio error when URL changes
  React.useEffect(() => {
    setAudioError(null);
  }, [playableUrl]);

  return (
    <div className="p-4 bg-muted rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <AudioFileHeader
          file={file}
          index={index}
          onRemove={handleRemove}
          onTogglePlayer={handleTogglePlayer}
        />
        
        <div className="flex gap-2 items-center">
          {file.storageUrl ? (
            <Badge variant="outline" className="gap-1 bg-green-50">
              <Cloud className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-700">Subido</span>
            </Badge>
          ) : isUploading ? (
            <Badge variant="outline" className="gap-1 bg-blue-50">
              <Cloud className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
              <span className="text-blue-700">Subiendo: {Math.round(uploadProgress)}%</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <CloudOff className="h-3.5 w-3.5" />
              <span>Local</span>
            </Badge>
          )}
        </div>
      </div>
      
      {showPlayer && playableUrl && (
        <div className="mt-3">
          <audio
            controls
            src={playableUrl}
            className="w-full"
            onError={(e) => {
              console.error("Audio playback error:", e);
              setAudioError("Error reproduciendo el archivo. Intente otra vez.");
            }}
          />
          {audioError && (
            <p className="text-xs text-red-500 mt-1">{audioError}</p>
          )}
        </div>
      )}
      
      <div className="space-y-2">
        {isUploading && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Subiendo a Supabase</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <ProgressIndicator isProcessing={true} progress={uploadProgress} />
          </div>
        )}
        
        <ProgressIndicator isProcessing={isProcessing} progress={progress} />
        
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
