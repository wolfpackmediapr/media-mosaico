import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FileUploadZone from "@/components/upload/FileUploadZone";
import TranscriptionSlot from "@/components/transcription/TranscriptionSlot";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useVideoProcessor } from "@/hooks/use-video-processor";

interface UploadedFile extends File {
  preview?: string;
}

const Radio = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  
  const { isUploading, uploadProgress, uploadFile } = useFileUpload();
  const {
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    processVideo,
    setTranscriptionText,
  } = useVideoProcessor();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const result = await uploadFile(file);
      if (result) {
        const uploadedFile = Object.assign(file, { preview: result.preview });
        setUploadedFiles(prev => [...prev, uploadedFile]);
        await processVideo(file);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          MONITOREO RADIO
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Sube, transcribe y analiza segmentos de audio de programas radiales de manera eficiente
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <FileUploadZone
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onFileInput={handleFileInput}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />

          <Card>
            <CardHeader>
              <CardTitle>Archivos Subidos</CardTitle>
              <CardDescription>
                Lista de archivos de audio procesados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedFiles.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No hay archivos subidos aún
                </p>
              ) : (
                <ul className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                    >
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <TranscriptionSlot
          isProcessing={isProcessing}
          transcriptionText={transcriptionText}
          metadata={transcriptionMetadata}
          onTranscriptionChange={setTranscriptionText}
        />
      </div>
    </div>
  );
};

export default Radio;