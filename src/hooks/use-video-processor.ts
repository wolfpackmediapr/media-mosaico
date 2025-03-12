
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
  segment_number: number;
  segment_title: string;
  timestamp_start: string;
  timestamp_end: string;
}

export interface TranscriptionAnalysis {
  summary?: string;
  content_safety_labels?: any;
  sentiment_analysis_results?: any[];
  entities?: any[];
  iab_categories_result?: any;
  chapters?: any[];
  auto_highlights_result?: any;
}

// Function to get the current authenticated user
const getAuthenticatedUser = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error('Authentication required');
  if (!user) throw new Error('Please log in to process videos');
  return user;
};

// Function to get file path from the latest transcription record
const getVideoFilePath = async (userId: string) => {
  const { data: transcriptionData, error: transcriptionError } = await supabase
    .from('transcriptions')
    .select('original_file_path')
    .eq('user_id', userId)
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
  return filePath;
};

// Function to process large files
const processLargeFile = async (filePath: string, setProgress: (progress: number) => void) => {
  setProgress(20);
  console.log("File is larger than 20MB, converting to audio first");

  try {
    const { data: conversionData, error: conversionError } = await supabase.functions
      .invoke('convert-to-audio', {
        body: { videoPath: filePath }
      });

    if (conversionError) throw conversionError;
    console.log("Conversion response:", conversionData);

    setProgress(50);
    return conversionData.audioPath;
  } catch (error) {
    console.error("Error in audio conversion:", error);
    // Fallback to direct transcription
    toast({
      title: "Conversion failed",
      description: "Intentando transcripción directa...",
    });
    return filePath;
  }
};

// Function to invoke transcription
const invokeTranscription = async (videoPath: string) => {
  try {
    const { data: transcriptionResult, error: processError } = await supabase.functions
      .invoke('transcribe-video', {
        body: { videoPath }
      });

    if (processError) throw processError;
    return transcriptionResult;
  } catch (mainError) {
    console.error('Primary transcription error:', mainError);
    
    // Try fallback endpoint
    const { data: fallbackResult, error: fallbackError } = await supabase.functions
      .invoke('secure-transcribe', {
        body: { filePath: videoPath }
      });
      
    if (fallbackError) throw fallbackError;
    return fallbackResult;
  }
};

// Function to create dummy data for development/fallback
const createDummyTranscriptionData = () => {
  return {
    text: "Esta es una transcripción de ejemplo para mostrar cuando la transcripción real falla. Estamos trabajando para solucionar el problema con el servicio de transcripción.",
    segments: [
      {
        headline: "Segmento 1",
        text: "Este es el primer segmento de la transcripción de ejemplo.",
        start: 0,
        end: 30000,
        segment_number: 1,
        segment_title: "Introducción",
        timestamp_start: "00:00",
        timestamp_end: "00:30"
      },
      {
        headline: "Segmento 2",
        text: "Este es el segundo segmento de la transcripción de ejemplo.",
        start: 30000,
        end: 60000,
        segment_number: 2,
        segment_title: "Desarrollo",
        timestamp_start: "00:30",
        timestamp_end: "01:00"
      }
    ]
  };
};

// Function to handle transcription results
const handleTranscriptionResults = (
  transcriptionResult: any, 
  setTranscriptionText: (text: string) => void,
  setNewsSegments: (segments: NewsSegment[]) => void,
  setAssemblyId: (id: string | null) => void,
  setAnalysis: (analysis: TranscriptionAnalysis | null) => void,
  setProgress: (progress: number) => void
) => {
  if (transcriptionResult?.text) {
    setTranscriptionText(transcriptionResult.text);
    
    // Handle news segments if available
    if (transcriptionResult.segments && Array.isArray(transcriptionResult.segments)) {
      setNewsSegments(transcriptionResult.segments);
    }
    
    // Store AssemblyAI ID if available
    if (transcriptionResult.assemblyId) {
      setAssemblyId(transcriptionResult.assemblyId);
    }
    
    // Store analysis data if available
    if (transcriptionResult.analysis) {
      setAnalysis(transcriptionResult.analysis);
    }
    
    setProgress(100);
    
    toast({
      title: "Transcripción completada",
      description: `Se han identificado ${transcriptionResult.segments?.length || 0} segmentos de noticias.`,
    });
  }
};

export const useVideoProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionMetadata, setTranscriptionMetadata] = useState<TranscriptionMetadata>();
  const [newsSegments, setNewsSegments] = useState<NewsSegment[]>([]);
  const [assemblyId, setAssemblyId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TranscriptionAnalysis | null>(null);

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setNewsSegments([]);
    console.log("Starting video processing for file:", file.name);

    try {
      // First check authentication
      const user = await getAuthenticatedUser();
      setProgress(10);

      // Get the file path
      const filePath = await getVideoFilePath(user.id);
      
      // Updated size limit to 20MB
      let transcribeFilePath = filePath;
      if (file.size > 20 * 1024 * 1024) {
        try {
          transcribeFilePath = await processLargeFile(filePath, setProgress);
        } catch (convError) {
          console.error("Conversion error, using original path:", convError);
          // Continue with original path if conversion fails
        }
      }

      try {
        // Process the file with transcription service
        const transcriptionResult = await invokeTranscription(transcribeFilePath);
        
        // Handle the transcription results
        handleTranscriptionResults(
          transcriptionResult, 
          setTranscriptionText, 
          setNewsSegments, 
          setAssemblyId, 
          setAnalysis,
          setProgress
        );
      } catch (transcriptionError) {
        console.error("All transcription attempts failed:", transcriptionError);
        
        // Use dummy data for development/fallback
        const dummyData = createDummyTranscriptionData();
        handleTranscriptionResults(
          dummyData,
          setTranscriptionText,
          setNewsSegments,
          setAssemblyId,
          setAnalysis,
          setProgress
        );
        
        toast({
          title: "Usando datos de ejemplo",
          description: "No se pudo transcribir el video. Mostrando datos de ejemplo.",
          variant: "destructive",
        });
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
    analysis,
    processVideo,
    setTranscriptionText,
    setNewsSegments
  };
};
