
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  TranscriptionResult, 
  fetchUtterances 
} from "@/services/audio/transcriptionService";
import { formatPlainTextAsSpeaker, formatSpeakerText } from "@/components/radio/utils/speakerTextUtils";

interface UseFetchUtterancesProps {
  transcriptionId?: string;
  transcriptionText: string;
  enhancedTranscriptionResult?: TranscriptionResult;
  setEnhancedTranscriptionResult: (result: TranscriptionResult | ((prev: TranscriptionResult | undefined) => TranscriptionResult)) => void;
  setLocalSpeakerText: (text: string) => void;
  onTranscriptionChange: (text: string) => void;
}

export const useFetchUtterances = ({
  transcriptionId,
  transcriptionText,
  enhancedTranscriptionResult,
  setEnhancedTranscriptionResult,
  setLocalSpeakerText,
  onTranscriptionChange
}: UseFetchUtterancesProps) => {
  const [isLoadingUtterances, setIsLoadingUtterances] = useState(false);

  useEffect(() => {
    const fetchSpeakerData = async () => {
      if (
        transcriptionId &&
        (!enhancedTranscriptionResult?.utterances || enhancedTranscriptionResult.utterances.length === 0) &&
        !isLoadingUtterances
      ) {
        try {
          setIsLoadingUtterances(true);
          console.log('[useFetchUtterances] Fetching utterances for ID:', transcriptionId);
          
          const utterances = await fetchUtterances(transcriptionId);
          
          if (utterances && utterances.length > 0) {
            console.log('[useFetchUtterances] Received utterances:', utterances.length);
            
            const formattedText = formatSpeakerText(utterances);
            
            setEnhancedTranscriptionResult(prev => ({
              ...(prev || {}),
              text: formattedText,
              utterances
            }) as TranscriptionResult);
            
            console.log('[useFetchUtterances] Setting formatted speaker text from fetched utterances');
            setLocalSpeakerText(formattedText);
            onTranscriptionChange(formattedText);
          } else {
            console.log('[useFetchUtterances] No utterances returned from fetch');
            if (transcriptionText) {
              const formattedText = formatPlainTextAsSpeaker(transcriptionText);
              setLocalSpeakerText(formattedText);
              onTranscriptionChange(formattedText);
            }
          }
        } catch (error) {
          console.error('[useFetchUtterances] Error fetching utterances:', error);
          toast.error("No se pudieron cargar los datos de hablantes");
          
          if (transcriptionText) {
            const formattedText = formatPlainTextAsSpeaker(transcriptionText);
            setLocalSpeakerText(formattedText);
            onTranscriptionChange(formattedText);
          }
        } finally {
          setIsLoadingUtterances(false);
        }
      }
    };
    
    fetchSpeakerData();
  }, [
    transcriptionId, 
    setLocalSpeakerText, 
    onTranscriptionChange, 
    transcriptionText, 
    enhancedTranscriptionResult?.utterances, 
    isLoadingUtterances,
    setEnhancedTranscriptionResult
  ]);

  return { isLoadingUtterances };
};
