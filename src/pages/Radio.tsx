import { useState } from "react";
import FileUploadZone from "@/components/upload/FileUploadZone";
import { useFileUpload } from "@/hooks/use-file-upload";
import { processAudioFile } from "@/components/radio/AudioProcessing";
import RadioTranscriptionSlot from "@/components/radio/RadioTranscriptionSlot";
import AudioFileItem from "@/components/radio/AudioFileItem";
import { toast } from "sonner";
import { TranscriptionAnalysis } from "@/types/assemblyai";

interface UploadedFile extends File {
  preview?: string;
}

const Radio = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionMetadata, setTranscriptionMetadata] = useState<{
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
    keywords?: string[];
    language?: string;
  }>();
  const [analysis, setAnalysis] = useState<TranscriptionAnalysis>();

  const { isUploading, uploadProgress, uploadFile } = useFileUpload();

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
        toast.error('Por favor, sube únicamente archivos de audio.');
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
    try {
      const fileIndex = uploadedFiles.findIndex(f => f === file);
      setCurrentFileIndex(fileIndex);
      setIsProcessing(true);
      setProgress(0);

      await processAudioFile(
        file,
        (text, metadata, analysisData) => {
          setTranscriptionText(text);
          setTranscriptionMetadata(metadata);
          setAnalysis(analysisData);
          setProgress(100);
          setIsProcessing(false);
        }
      );
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Error al procesar el archivo de audio');
      setIsProcessing(false);
      setProgress(0);
    }
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