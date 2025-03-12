
import { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AudioPlayer } from "@/components/radio/AudioPlayer";
import AudioFileItem from "@/components/radio/AudioFileItem";
import { processAudioFile } from "@/components/radio/AudioProcessing";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadedFile extends File {
  preview?: string;
}

interface AudioFileListProps {
  files: UploadedFile[];
  currentFileIndex: number;
  setCurrentFileIndex: Dispatch<SetStateAction<number>>;
  isProcessing: boolean;
  progress: number;
  handleRemoveFile: (index: number) => void;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
  setProgress: Dispatch<SetStateAction<number>>;
  setTranscriptionText: Dispatch<SetStateAction<string>>;
  setTranscriptionId: Dispatch<SetStateAction<string | undefined>>;
}

const AudioFileList = ({
  files,
  currentFileIndex,
  setCurrentFileIndex,
  isProcessing,
  progress,
  handleRemoveFile,
  setIsProcessing,
  setProgress,
  setTranscriptionText,
  setTranscriptionId
}: AudioFileListProps) => {
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

      // Fix: Use the updated text from the callback instead of referencing transcriptionText directly
      // Get the current text from a new state update to ensure it's the latest value
      const { error: updateError } = await supabase
        .from('transcriptions')
        .update({
          transcription_text: transcriptionData.transcription_text, // This should be the latest text but needs to be captured
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

  const handlePreviousFile = () => {
    setCurrentFileIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextFile = () => {
    setCurrentFileIndex((prev) => Math.min(files.length - 1, prev + 1));
  };

  return (
    <div className="space-y-4 w-full">
      <div className="bg-muted rounded-lg p-4 w-full">
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
  );
};

export default AudioFileList;
