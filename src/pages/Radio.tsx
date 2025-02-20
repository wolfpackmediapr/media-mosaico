import { useState } from "react";
import FileUploadZone from "@/components/upload/FileUploadZone";
import AudioFileItem from "@/components/radio/AudioFileItem";
import RadioTranscriptionSlot from "@/components/radio/RadioTranscriptionSlot";
import { processAudioFile } from "@/components/radio/AudioProcessing";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AudioPlayer } from "@/components/radio/AudioPlayer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadedFile extends File {
  preview?: string;
}

const Radio = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionId, setTranscriptionId] = useState<string>();
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [metadata, setMetadata] = useState<{
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
  }>();

  const handleFilesAdded = (newFiles: File[]) => {
    const audioFiles = newFiles.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length < newFiles.length) {
      console.warn('Some files were skipped because they were not audio files');
    }

    const uploadedFiles = audioFiles.map((file) => {
      const uploadedFile = new File([file], file.name, { type: file.type });
      Object.defineProperty(uploadedFile, 'preview', {
        value: URL.createObjectURL(file),
        writable: true
      });
      console.log('Added audio file:', uploadedFile);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Debes iniciar sesión para procesar transcripciones");
        return;
      }

      const { data: transcriptionData, error: transcriptionError } = await supabase
        .from('transcriptions')
        .insert({
          original_file_path: file.name,
          status: 'processing',
          user_id: user.id
        })
        .select()
        .single();

      if (transcriptionError) throw transcriptionError;

      setTranscriptionId(transcriptionData.id);

      await processAudioFile(file, (text) => {
        setTranscriptionText(text);
        setProgress(100);
      });

      const { error: updateError } = await supabase
        .from('transcriptions')
        .update({
          transcription_text: transcriptionText,
          status: 'completed'
        })
        .eq('id', transcriptionData.id);

      if (updateError) throw updateError;

    } catch (error: any) {
      console.error("Error processing file:", error);
      toast.error(error.message || "Error al procesar el archivo");
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
            accept="audio/*"
            message="Arrastra y suelta archivos de audio o haz clic para seleccionarlos"
          />
          {files.length > 0 && (
            <div className="space-y-4">
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
                <AudioPlayer 
                  file={files[currentFileIndex]}
                  onEnded={handleNextFile}
                />
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
            </div>
          )}
        </div>
        <div>
          <RadioTranscriptionSlot
            isProcessing={isProcessing}
            transcriptionText={transcriptionText}
            transcriptionId={transcriptionId}
            metadata={metadata}
            onTranscriptionChange={handleTranscriptionChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Radio;
