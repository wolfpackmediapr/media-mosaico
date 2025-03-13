
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TranscriptionMetadata {
  channel?: string;
  program?: string;
  category?: string;
  broadcastTime?: string;
  keywords?: string[];
}

export interface NewsSegment {
  headline: string;
  text: string;
  start: number;
  end: number;
  keywords?: string[];
  similarity?: number;
}

export const useVideoProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionMetadata, setTranscriptionMetadata] = useState<TranscriptionMetadata>();
  const [newsSegments, setNewsSegments] = useState<NewsSegment[]>([]);
  const [assemblyId, setAssemblyId] = useState<string | null>(null);

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setNewsSegments([]);
    console.log("Starting video processing for file:", file.name);

    try {
      // First check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error('Authentication required');
      if (!user) throw new Error('Please log in to process videos');

      setProgress(10);

      // Get the actual file path from the latest transcription record
      const { data: transcriptionData, error: transcriptionError } = await supabase
        .from('transcriptions')
        .select('original_file_path')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (transcriptionError) {
        console.error('Error getting transcription record:', transcriptionError);
        throw new Error('Could not find the file in our system');
      }
      
      const filePath = transcriptionData?.original_file_path;
      if (!filePath) {
        throw new Error('No file path found in database');
      }
      
      console.log('Using file path from database:', filePath);

      // Updated size limit to 20MB
      if (file.size > 20 * 1024 * 1024) {
        console.log("File is larger than 20MB, converting to audio first");
        setProgress(20);

        const { data: conversionData, error: conversionError } = await supabase.functions
          .invoke('convert-to-audio', {
            body: { videoPath: filePath }
          });

        if (conversionError) throw conversionError;
        console.log("Conversion response:", conversionData);

        setProgress(50);

        // Process the converted audio file
        const { data: transcriptionResult, error: processError } = await supabase.functions
          .invoke('transcribe-video', {
            body: { videoPath: conversionData.audioPath }
          });

        if (processError) throw processError;
        setProgress(90);

        if (transcriptionResult?.text) {
          setTranscriptionText(transcriptionResult.text);
          
          // Handle news segments if available
          if (transcriptionResult.segments && Array.isArray(transcriptionResult.segments)) {
            console.log("Received segments:", transcriptionResult.segments);
            setNewsSegments(transcriptionResult.segments);
          }
          
          // Store AssemblyAI ID if available
          if (transcriptionResult.assemblyId) {
            setAssemblyId(transcriptionResult.assemblyId);
          }
          
          setProgress(100);
          
          toast({
            title: "Transcripción completada",
            description: `Se han identificado ${transcriptionResult.segments?.length || 0} segmentos de noticias.`,
          });
        }
      } else {
        // For smaller files, process directly
        const { data: transcriptionResult, error: processError } = await supabase.functions
          .invoke('transcribe-video', {
            body: { videoPath: filePath }
          });

        if (processError) throw processError;

        if (transcriptionResult?.text) {
          setTranscriptionText(transcriptionResult.text);
          
          // Handle news segments if available
          if (transcriptionResult.segments && Array.isArray(transcriptionResult.segments)) {
            console.log("Received segments:", transcriptionResult.segments);
            setNewsSegments(transcriptionResult.segments);
          }
          
          // Store AssemblyAI ID if available
          if (transcriptionResult.assemblyId) {
            setAssemblyId(transcriptionResult.assemblyId);
          }
          
          setProgress(100);
          
          toast({
            title: "Transcripción completada",
            description: `Se han identificado ${transcriptionResult.segments?.length || 0} segmentos de noticias.`,
          });
        }
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast({
        title: "Error al procesar",
        description: error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
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
    assemblyId,
    processVideo,
    setTranscriptionText,
    setNewsSegments
  };
};
