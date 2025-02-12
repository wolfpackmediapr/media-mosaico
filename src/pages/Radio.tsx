
import { useState } from "react";
import FileUploadZone from "@/components/upload/FileUploadZone";
import AudioFileItem from "@/components/radio/AudioFileItem";
import TranscriptionSlot from "@/components/transcription/TranscriptionSlot";
import { processAudioFile } from "@/components/radio/AudioProcessing";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface UploadedFile extends File {
  preview?: string;
}

const Radio = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

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
      if (currentFileIndex >= newFiles.length && currentFileIndex > 0) {
        setCurrentFileIndex(newFiles.length - 1);
      }
      return newFiles;
    });
  };

  const handleProcess = async (file: UploadedFile) => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      await processAudioFile(file, (text) => {
        setTranscriptionText(text);
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

  const handlePreviousFile = () => {
    setCurrentFileIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextFile = () => {
    setCurrentFileIndex((prev) => Math.min(files.length - 1, prev + 1));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          {files.length > 0 && (
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousFile}
                  disabled={currentFileIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentFileIndex + 1} de {files.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextFile}
                  disabled={currentFileIndex === files.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <AudioFileItem
                key={`${files[currentFileIndex].name}-${currentFileIndex}`}
                file={files[currentFileIndex]}
                index={currentFileIndex}
                isProcessing={isProcessing}
                progress={progress}
                onProcess={handleProcess}
                onRemove={handleRemoveFile}
              />
            </div>
          )}
        </div>
        <div>
          <TranscriptionSlot
            isProcessing={isProcessing}
            transcriptionText={transcriptionText}
            onTranscriptionChange={handleTranscriptionChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Radio;
