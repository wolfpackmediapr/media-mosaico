
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AudioFileItem from "./AudioFileItem";

interface UploadedFile extends File {
  preview?: string;
}

interface AudioFileListProps {
  uploadedFiles: UploadedFile[];
  onProcess: (file: UploadedFile) => void;
  onTranscriptionComplete?: (text: string) => void;
  onRemoveFile?: (index: number) => void;
}

const AudioFileList = ({
  uploadedFiles,
  onProcess,
  onTranscriptionComplete,
  onRemoveFile,
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
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioFileList;
