import { useState } from "react";
import FileUploadZone from "@/components/upload/FileUploadZone";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useVideoProcessor } from "@/hooks/use-video-processor";
import RadioTranscriptionSlot from "@/components/radio/RadioTranscriptionSlot";
import AudioFileItem from "@/components/radio/AudioFileItem";

interface UploadedFile extends File {
  preview?: string;
}

const Radio = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number | null>(null);

  const { isUploading, uploadProgress, uploadFile } = useFileUpload();
  const {
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    analysis,
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
      if (file.type.startsWith('audio/')) {
        const result = await uploadFile(file);
        if (result) {
          const uploadedFile = Object.assign(file, { preview: result.preview });
          setUploadedFiles(prev => [...prev, uploadedFile]);
        }
      } else {
        console.error('Invalid file type. Please upload audio files only.');
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

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    if (currentFileIndex === index) {
      setCurrentFileIndex(null);
    }
  };

  const handleProcessFile = async (file: UploadedFile) => {
    const fileIndex = uploadedFiles.findIndex(f => f === file);
    setCurrentFileIndex(fileIndex);
    await processVideo(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">MONITOREO RADIO</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Sube, transcribe y analiza contenido de radio de manera eficiente
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FileUploadZone
          isDragging={isDragging}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileInput={handleFileInput}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />

        <div className="space-y-4">
          {uploadedFiles.map((file, index) => (
            <AudioFileItem
              key={index}
              file={file}
              index={index}
              isProcessing={isProcessing && currentFileIndex === index}
              progress={progress}
              onProcess={handleProcessFile}
              onRemove={handleRemoveFile}
            />
          ))}
        </div>
      </div>

      <RadioTranscriptionSlot
        isProcessing={isProcessing}
        transcriptionText={transcriptionText}
        metadata={transcriptionMetadata}
        analysis={analysis}
        onTranscriptionChange={setTranscriptionText}
      />
    </div>
  );
};

export default Radio;