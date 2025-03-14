
import { useState, useEffect } from "react";
import FileUploadSection from "./FileUploadSection";
import RadioTranscriptionSlot from "./RadioTranscriptionSlot";
import RadioNewsSegmentsContainer, { RadioNewsSegment } from "./RadioNewsSegmentsContainer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadedFile extends File {
  preview?: string;
}

const RadioContainer = () => {
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
  const [newsSegments, setNewsSegments] = useState<RadioNewsSegment[]>([]);

  const handleTranscriptionChange = (newText: string) => {
    setTranscriptionText(newText);
  };

  const handleSeekToTimestamp = (timestamp: number) => {
    const audioElements = document.querySelectorAll('audio');
    if (audioElements.length > 0) {
      const audioElement = audioElements[0];
      audioElement.currentTime = timestamp / 1000;
      audioElement.play();
    } else {
      console.warn('No audio element found to seek');
    }
  };

  const handleSegmentsReceived = (segments: RadioNewsSegment[]) => {
    if (segments && segments.length > 0) {
      setNewsSegments(segments);
    }
  };

  useEffect(() => {
    // Load Typeform embed script
    const script = document.createElement('script');
    script.src = "//embed.typeform.com/next/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 w-full">
          <FileUploadSection 
            files={files}
            setFiles={setFiles}
            currentFileIndex={currentFileIndex}
            setCurrentFileIndex={setCurrentFileIndex}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            progress={progress}
            setProgress={setProgress}
            transcriptionText={transcriptionText}
            setTranscriptionText={setTranscriptionText}
            setTranscriptionId={setTranscriptionId}
          />
        </div>
        <div className="w-full">
          <RadioTranscriptionSlot
            isProcessing={isProcessing}
            transcriptionText={transcriptionText}
            transcriptionId={transcriptionId}
            metadata={metadata}
            onTranscriptionChange={handleTranscriptionChange}
            onSegmentsReceived={handleSegmentsReceived}
          />
        </div>
      </div>

      {transcriptionText && (
        <RadioNewsSegmentsContainer
          segments={newsSegments}
          onSegmentsChange={setNewsSegments}
          onSeek={handleSeekToTimestamp}
          isProcessing={isProcessing}
        />
      )}

      <div className="mt-8 p-6 bg-muted rounded-lg w-full">
        <h2 className="text-2xl font-bold mb-4">Alerta Radio</h2>
        <div data-tf-live="01JEWES3GA7PPQN2SPRNHSVHPG" className="h-[500px] md:h-[600px]"></div>
      </div>
    </div>
  );
};

export default RadioContainer;
