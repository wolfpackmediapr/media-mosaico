
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import VideoUploadSection from "../VideoUploadSection";

interface UploadedFile extends File {
  preview?: string;
}

interface TvUploadContainerProps {
  uploadedFiles: UploadedFile[];
  setUploadedFiles: (files: UploadedFile[]) => void;
  onProcess: (file: UploadedFile) => void;
  onRemoveFile: (index: number) => void;
  isProcessing: boolean;
  progress: number;
}

const TvUploadContainer = ({
  uploadedFiles,
  setUploadedFiles,
  onProcess,
  onRemoveFile,
  isProcessing,
  progress
}: TvUploadContainerProps) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFilesUploaded = (files: File[]) => {
    const filesWithPreview = files.map(file => {
      const fileWithPreview = Object.assign(file, {
        preview: URL.createObjectURL(file)
      });
      return fileWithPreview;
    });
    setUploadedFiles([...uploadedFiles, ...filesWithPreview]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir Videos</CardTitle>
        <CardDescription>
          Sube archivos de video para transcribir (máximo 80MB)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VideoUploadSection
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          onFilesUploaded={handleFilesUploaded}
        />
      </CardContent>
    </Card>
  );
};

export default TvUploadContainer;
