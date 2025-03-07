
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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

interface CachedTranscription {
  text: string;
  metadata?: TranscriptionMetadata;
  segments: NewsSegment[];
  timestamp: number;
}

// Local storage key for caching
const TRANSCRIPTION_CACHE_KEY = 'video_transcription_cache';

// Get cached transcription from local storage
const getCachedTranscription = (): CachedTranscription | null => {
  try {
    const cached = localStorage.getItem(TRANSCRIPTION_CACHE_KEY);
    if (!cached) return null;
    
    const parsedCache = JSON.parse(cached) as CachedTranscription;
    
    // Verify cache is not older than 24 hours
    const cacheAge = Date.now() - parsedCache.timestamp;
    if (cacheAge > 24 * 60 * 60 * 1000) return null;
    
    return parsedCache;
  } catch (error) {
    console.error('Error retrieving cache:', error);
    return null;
  }
};

// Save transcription to local storage
const cacheTranscription = (transcription: string, segments: NewsSegment[], metadata?: TranscriptionMetadata) => {
  try {
    const cacheData: CachedTranscription = {
      text: transcription,
      segments,
      metadata,
      timestamp: Date.now()
    };
    localStorage.setItem(TRANSCRIPTION_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching transcription:', error);
  }
};

export const useVideoProcessor = () => {
  // Get initial state from cache
  const cachedData = getCachedTranscription();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState(cachedData?.text || "");
  const [transcriptionMetadata, setTranscriptionMetadata] = useState<TranscriptionMetadata | undefined>(
    cachedData?.metadata
  );
  const [newsSegments, setNewsSegments] = useState<NewsSegment[]>(cachedData?.segments || []);

  // Use mutation for video processing
  const processVideoMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log("Starting video processing for file:", file.name);
      setProgress(0);

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
        
        return transcriptionResult;
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
        
        return transcriptionResult;
      }
    },
    onMutate: () => {
      setIsProcessing(true);
    },
    onSuccess: (data) => {
      if (data?.text) {
        setTranscriptionText(data.text);
        
        // Handle segments if available
        if (data.segments && Array.isArray(data.segments)) {
          console.log("Received segments:", data.segments);
          setNewsSegments(data.segments);
        } else {
          // Default to a single segment if no segments were identified
          console.log("No segments received, creating default segment");
          setNewsSegments([{
            title: "Transcripción completa",
            text: data.text,
            startTime: 0,
            endTime: 0
          }]);
        }
        
        setProgress(100);
        
        // Cache the transcription result
        cacheTranscription(data.text, data.segments || [], transcriptionMetadata);
        
        toast.success("Transcripción completada. El video ha sido transcrito y segmentado exitosamente.");
      }
    },
    onError: (error: any) => {
      console.error('Error processing file:', error);
      toast.error(error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente.");
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  const processVideo = (file: File) => {
    processVideoMutation.mutate(file);
  };

  // Custom handler for updating transcription text
  const updateTranscriptionText = (text: string) => {
    setTranscriptionText(text);
    // Update cache
    cacheTranscription(text, newsSegments, transcriptionMetadata);
  };

  // Custom handler for updating news segments
  const updateNewsSegments = (segments: NewsSegment[]) => {
    setNewsSegments(segments);
    // Update cache
    cacheTranscription(transcriptionText, segments, transcriptionMetadata);
  };

  return {
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    newsSegments,
    processVideo,
    setTranscriptionText: updateTranscriptionText,
    setNewsSegments: updateNewsSegments,
  };
};
