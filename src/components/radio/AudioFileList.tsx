import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioFileItem } from "./audio-file";

interface UploadedFile extends File {
  preview?: string;
}

interface AudioFileListProps {
  uploadedFiles: UploadedFile[];
  onProcess: (file: UploadedFile) => void;
  onTranscriptionComplete?: (text: string) => void;
  onRemoveFile?: (index: number) => void;
  currentFileIndex?: number;
  setCurrentFileIndex?: React.Dispatch<React.SetStateAction<number>>;
  isProcessing?: boolean;
  progress?: number;
  setIsProcessing?: React.Dispatch<React.SetStateAction<boolean>>;
  setProgress?: React.Dispatch<React.SetStateAction<number>>;
  setTranscriptionId?: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const AudioFileList = ({
  uploadedFiles,
  onProcess,
  onTranscriptionComplete,
  onRemoveFile,
  currentFileIndex,
  setCurrentFileIndex,
  isProcessing,
  progress,
  setIsProcessing,
  setProgress,
  setTranscriptionId
}: AudioFileListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Archivos de Audio</CardTitle>
        <CardDescription>Lista de archivos de audio listos para procesar</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {uploadedFiles.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay archivos cargados</p>
          ) : (
            uploadedFiles.map((file, index) => (
              <AudioFileItem
                key={index}
                file={file}
                index={index}
                onProcess={onProcess}
                onTranscriptionComplete={onTranscriptionComplete}
                onRemove={onRemoveFile}
                isProcessing={isProcessing && currentFileIndex === index}
                progress={progress}
                setIsProcessing={setIsProcessing}
                setProgress={setProgress}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioFileList;
