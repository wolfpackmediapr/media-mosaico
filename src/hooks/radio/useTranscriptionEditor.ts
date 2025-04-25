
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/use-autosave";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { 
  TranscriptionResult, 
  fetchUtterances, 
  UtteranceTimestamp 
} from "@/services/audio/transcriptionService";
import { 
  formatSpeakerText, 
  parseSpeakerTextToUtterances,
  formatPlainTextAsSpeaker 
} from "@/components/radio/utils/speakerTextUtils";

interface UseTranscriptionEditorProps {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onTranscriptionChange: (text: string) => void;
}

export const useTranscriptionEditor = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  onTranscriptionChange,
}: UseTranscriptionEditorProps) => {
  const { toast } = useToast();
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = usePersistentState(
    `transcription-editor-mode-${transcriptionId || "draft"}`,
    false,
    { storage: 'sessionStorage' }
  );

  const [enhancedTranscriptionResult, setEnhancedTranscriptionResult] =
    useState<TranscriptionResult | undefined>(transcriptionResult);
  const [isLoadingUtterances, setIsLoadingUtterances] = useState(false);

  const hasSpeakerLabels = Boolean(
    enhancedTranscriptionResult?.utterances &&
    enhancedTranscriptionResult.utterances.length > 0
  );

  const [localSpeakerText, setLocalSpeakerText, removeLocalSpeakerText] = usePersistentState(
    `radio-transcription-speaker-${transcriptionId || "draft"}`,
    "",
    { storage: 'sessionStorage' }
  );

  // Process the initial transcription text or result when they change
  useEffect(() => {
    // When we receive a transcription result with utterances
    if (transcriptionResult?.utterances && transcriptionResult.utterances.length > 0) {
      console.log('[useTranscriptionEditor] New transcription result with utterances received');
      setEnhancedTranscriptionResult(transcriptionResult);
      const formattedText = formatSpeakerText(transcriptionResult.utterances);
      if (formattedText && localSpeakerText !== formattedText) {
        console.log('[useTranscriptionEditor] Setting formatted speaker text from utterances');
        setLocalSpeakerText(formattedText);
        onTranscriptionChange(formattedText);
      }
    } 
    // When we have just plain text but no utterances
    else if (transcriptionText && (!localSpeakerText || localSpeakerText !== transcriptionText)) {
      console.log('[useTranscriptionEditor] Processing plain transcription text');
      // Try to format the text properly if it's plain text
      const formattedText = formatPlainTextAsSpeaker(transcriptionText);
      setLocalSpeakerText(formattedText);
      onTranscriptionChange(formattedText);
      
      // Try to parse utterances from the text if possible
      const parsedUtterances = parseSpeakerTextToUtterances(formattedText);
      if (parsedUtterances.length > 0) {
        setEnhancedTranscriptionResult(prev => ({
          ...(prev || {}),
          text: formattedText, // Ensure text is always provided
          utterances: parsedUtterances
        }) as TranscriptionResult);
      }
    }
  }, [transcriptionResult, transcriptionText, setLocalSpeakerText, onTranscriptionChange, localSpeakerText]);

  // Fetch additional data (utterances) when we have a transcript ID but no utterances
  useEffect(() => {
    const fetchSpeakerData = async () => {
      if (
        transcriptionId &&
        (!enhancedTranscriptionResult?.utterances || enhancedTranscriptionResult.utterances.length === 0) &&
        !isLoadingUtterances
      ) {
        try {
          setIsLoadingUtterances(true);
          console.log('[useTranscriptionEditor] Fetching utterances for ID:', transcriptionId);
          
          const utterances = await fetchUtterances(transcriptionId);
          
          if (utterances && utterances.length > 0) {
            console.log('[useTranscriptionEditor] Received utterances:', utterances.length);
            
            const formattedText = formatSpeakerText(utterances);
            
            setEnhancedTranscriptionResult(prev => ({
              ...(prev || {}),
              text: formattedText, // Ensure text is always provided
              utterances
            }) as TranscriptionResult);
            
            console.log('[useTranscriptionEditor] Setting formatted speaker text from fetched utterances');
            setLocalSpeakerText(formattedText);
            onTranscriptionChange(formattedText);
          } else {
            console.log('[useTranscriptionEditor] No utterances returned from fetch');
            // If no utterances were found but we have text, format it properly
            if (transcriptionText) {
              const formattedText = formatPlainTextAsSpeaker(transcriptionText);
              setLocalSpeakerText(formattedText);
              onTranscriptionChange(formattedText);
            }
          }
        } catch (error) {
          console.error('[useTranscriptionEditor] Error fetching utterances:', error);
          toast({
            title: "No se pudieron cargar los datos de hablantes",
            description: "Usando formato de texto simple. Intente nuevamente más tarde.",
            variant: "default",
          });
          
          // Fallback to simple text formatting
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
  }, [transcriptionId, setLocalSpeakerText, onTranscriptionChange, toast, transcriptionText, enhancedTranscriptionResult?.utterances, isLoadingUtterances]);

  const { isSaving, saveSuccess } = useAutosave({
    data: { text: localSpeakerText, id: transcriptionId },
    onSave: async (data) => {
      if (!data.id) return;
      try {
        setSaveError(null);
        // Update to match the correct table schema
        const { error } = await supabase
          .from('radio_transcriptions')
          .update({
            transcription_text: data.text,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id);
        
        if (error) {
          console.error('[useTranscriptionEditor] Error saving:', error);
          setSaveError(error.message);
          throw error;
        }
      } catch (error) {
        console.error('[useTranscriptionEditor] Error in save operation:', error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        setSaveError(errorMessage);
        toast({
          title: "Error al guardar",
          description: "No se pudo guardar la transcripción",
          variant: "destructive",
        });
        throw error;
      }
    },
    debounce: 2000,
    enabled: !!transcriptionId && !!localSpeakerText,
  });

  useEffect(() => {
    if (saveSuccess === true) {
      setSaveError(null);
      toast({
        title: "Guardado automático",
        description: "La transcripción se ha guardado correctamente",
      });
    }
  }, [saveSuccess, toast]);

  const handleTextChange = (newText: string) => {
    if (!newText) return;
    
    setLocalSpeakerText(newText);
    onTranscriptionChange(newText);
    
    // Try to parse the new text to update utterances
    const newUtterances = parseSpeakerTextToUtterances(newText);
    if (newUtterances.length > 0) {
      setEnhancedTranscriptionResult(prev => {
        return {
          ...(prev || {}),
          text: newText, // Ensure text is always provided
          utterances: newUtterances
        } as TranscriptionResult;
      });
    }
    
    if (!isEditing) setIsEditing(true);
  };

  const resetLocalSpeakerText = () => {
    console.log('[useTranscriptionEditor] Resetting local speaker text');
    removeLocalSpeakerText();
    setLocalSpeakerText("");
    setIsEditing(false);
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  return {
    localText: localSpeakerText,
    isEditing,
    isLoadingUtterances,
    isSaving,
    saveError,
    saveSuccess,
    handleTextChange,
    toggleEditMode,
    hasSpeakerLabels,
    resetLocalSpeakerText,
    enhancedTranscriptionResult
  };
};
