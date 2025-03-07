
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TranscriptionMetadata {
  channel?: string;
  program?: string;
  category?: string;
  broadcastTime?: string;
  keywords?: string[];
}

export interface NewsSegment {
  title: string;
  text: string;
  startTime: number;
  endTime: number;
  keywords?: string[];
  category?: string;
}

export const useVideoProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionMetadata, setTranscriptionMetadata] = useState<TranscriptionMetadata>();
  const [newsSegments, setNewsSegments] = useState<NewsSegment[]>([]);

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    console.log("Starting video processing for file:", file.name);

    try {
      // First check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error('Authentication required');
      if (!user) throw new Error('Please log in to process videos');

      setProgress(10);

      // Updated size limit to 20MB
      if (file.size > 20 * 1024 * 1024) {
        console.log("File is larger than 20MB, converting to audio first");
        setProgress(20);

        const { data: conversionData, error: conversionError } = await supabase.functions
          .invoke('convert-to-audio', {
            body: { videoPath: file.name }
          });

        if (conversionError) {
          console.error("Conversion error:", conversionError);
          throw new Error(`Error converting video: ${conversionError.message}`);
        }
        
        console.log("Conversion response:", conversionData);

        setProgress(50);

        // Process the converted audio file with segment identification explicitly set to true
        const { data: transcriptionResult, error: processError } = await supabase.functions
          .invoke('transcribe-video', {
            body: { 
              videoPath: conversionData.audioPath,
              identifySegments: true 
            }
          });

        if (processError) {
          console.error("Transcription error:", processError);
          throw new Error(`Error transcribing audio: ${processError.message}`);
        }
        
        setProgress(80);

        console.log("Transcription result:", transcriptionResult);

        if (transcriptionResult?.text) {
          setTranscriptionText(transcriptionResult.text);
          
          // Handle segments if available
          if (transcriptionResult.segments && Array.isArray(transcriptionResult.segments)) {
            console.log("Received segments:", transcriptionResult.segments);
            setNewsSegments(transcriptionResult.segments);
          } else {
            // Default to a single segment if no segments were identified
            console.log("No segments received, creating default segment");
            setNewsSegments([{
              title: "Transcripción completa",
              text: transcriptionResult.text,
              startTime: 0,
              endTime: 0
            }]);
          }
          
          setProgress(100);
          
          toast.success("Transcripción completada. El video ha sido transcrito y segmentado exitosamente.");
        }
      } else {
        // For smaller files, process directly with segment identification explicitly set to true
        const { data: transcriptionResult, error: processError } = await supabase.functions
          .invoke('transcribe-video', {
            body: { 
              videoPath: file.name,
              identifySegments: true 
            }
          });

        if (processError) {
          console.error("Transcription error:", processError);
          throw new Error(`Error transcribing video: ${processError.message}`);
        }
        
        console.log("Transcription result for small file:", transcriptionResult);

        if (transcriptionResult?.text) {
          setTranscriptionText(transcriptionResult.text);
          
          // Handle segments if available
          if (transcriptionResult.segments && Array.isArray(transcriptionResult.segments)) {
            console.log("Received segments for small file:", transcriptionResult.segments);
            setNewsSegments(transcriptionResult.segments);
          } else {
            // Default to a single segment if no segments were identified
            console.log("No segments received for small file, creating default segment");
            setNewsSegments([{
              title: "Transcripción completa",
              text: transcriptionResult.text,
              startTime: 0,
              endTime: 0
            }]);
          }
          
          setProgress(100);
          
          toast.success("Transcripción completada. El video ha sido transcrito y segmentado exitosamente.");
        }
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast.error(error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    newsSegments,
    processVideo,
    setTranscriptionText,
    setNewsSegments,
  };
};
