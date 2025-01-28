import { useState } from "react";
import FileUploadZone from "@/components/upload/FileUploadZone";
import AudioFileItem from "@/components/radio/AudioFileItem";
import TranscriptionSlot from "@/components/transcription/TranscriptionSlot";
import { processAudioFile } from "@/components/radio/AudioProcessing";
import { TranscriptionAnalysis } from "@/types/assemblyai";

interface UploadedFile extends File {
  preview?: string;
}

const Radio = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
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

  const handleFilesAdded = (newFiles: File[]) => {
    const uploadedFiles = newFiles.map((file) => {
      const uploadedFile = new File([file], file.name, { type: file.type });
      Object.defineProperty(uploadedFile, 'preview', {
        value: URL.createObjectURL(file),
        writable: true
      });
      console.log('Added file:', uploadedFile);
      return uploadedFile as UploadedFile;
    });
    setFiles((prevFiles) => [...prevFiles, ...uploadedFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => {
      const newFiles = [...prevFiles];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleProcess = async (file: UploadedFile) => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      await processAudioFile(file, (text, metadata, analysisData) => {
        setTranscriptionText(text);
        setTranscriptionMetadata(metadata);
        setAnalysis(analysisData);
        setProgress(100);
      });
    } catch (error) {
      console.error("Error processing file:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranscriptionChange = (newText: string) => {
    setTranscriptionText(newText);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <FileUploadZone
            isDragging={false}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files);
              handleFilesAdded(files);
            }}
            onFileInput={(e) => {
              const files = Array.from(e.target.files || []);
              handleFilesAdded(files);
            }}
          />
          <div className="space-y-4">
            {files.map((file, index) => (
              <AudioFileItem
                key={`${file.name}-${index}`}
                file={file}
                index={index}
                isProcessing={isProcessing}
                progress={progress}
                onProcess={handleProcess}
                onRemove={handleRemoveFile}
              />
            ))}
          </div>
        </div>
        
        <div className="flex flex-col space-y-6">
          <TranscriptionSlot
            isProcessing={isProcessing}
            transcriptionText={transcriptionText}
            metadata={transcriptionMetadata}
            analysis={analysis}
            onTranscriptionChange={handleTranscriptionChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Radio;