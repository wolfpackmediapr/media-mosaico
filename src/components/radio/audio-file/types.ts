
import React from 'react';

export interface UploadedFile extends File {
  preview?: string;
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

export interface AudioFileHeaderProps {
  file: UploadedFile;
  index: number;
  onRemove?: (index: number) => void;
  onTogglePlayer: () => void;
}

export interface ProcessButtonProps {
  isProcessing: boolean;
  processingComplete: boolean;
  progress: number;
  onProcess: () => void;
}

export interface ProgressIndicatorProps {
  isProcessing: boolean;
  progress: number;
}
