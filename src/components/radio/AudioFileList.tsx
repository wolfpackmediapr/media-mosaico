
import React from 'react';
import { UploadedFile } from '@/components/radio/types';
import AudioFileItem from '@/components/radio/audio-file/AudioFileItem';
import { TranscriptionResult } from '@/services/audio/transcriptionService';

interface AudioFileListProps {
  uploadedFiles: UploadedFile[];
  onProcess: (file: UploadedFile) => Promise<TranscriptionResult | null>;
  onTranscriptionComplete?: (text: string) => void;
  onRemoveFile: (index: number) => void;
  currentFileIndex: number;
  setCurrentFileIndex: (index: number) => void;
  isProcessing?: boolean;
  progress?: number;
  setIsProcessing?: React.Dispatch<React.SetStateAction<boolean>>;
  setProgress?: React.Dispatch<React.SetStateAction<number>>;
  setTranscriptionId?: (id?: string) => void;
  uploadProgress?: Record<string, number>;
  isUploading?: Record<string, boolean>;
  cancelUpload?: (fileName: string) => void;
}

const AudioFileList: React.FC<AudioFileListProps> = ({
  uploadedFiles,
  onProcess,
  onTranscriptionComplete,
  onRemoveFile,
  currentFileIndex,
  setCurrentFileIndex,
  isProcessing = false,
  progress = 0,
  setIsProcessing,
  setProgress,
  setTranscriptionId,
  uploadProgress = {},
  isUploading = {},
  cancelUpload
}) => {
  const handleProcessFile = async (file: UploadedFile) => {
    setCurrentFileIndex(uploadedFiles.indexOf(file));
    try {
      const result = await onProcess(file);
      if (result?.transcript_id && setTranscriptionId) {
        setTranscriptionId(result.transcript_id);
      }
      return result;
    } catch (error) {
      console.error('[AudioFileList] Error processing file:', error);
      return null;
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {uploadedFiles.map((file, index) => (
        <AudioFileItem
          key={`${file.name}-${index}`}
          file={file}
          index={index}
          onProcess={handleProcessFile}
          onTranscriptionComplete={onTranscriptionComplete}
          onRemove={onRemoveFile}
          isProcessing={isProcessing && currentFileIndex === index}
          progress={currentFileIndex === index ? progress : 0}
          setIsProcessing={setIsProcessing}
          setProgress={setProgress}
          isUploading={isUploading[file.name]}
          uploadProgress={uploadProgress[file.name] || 0}
          cancelUpload={cancelUpload ? () => cancelUpload(file.name) : undefined}
        />
      ))}
    </div>
  );
};

export default AudioFileList;
