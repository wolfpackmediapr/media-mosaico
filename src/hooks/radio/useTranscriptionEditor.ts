
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/use-autosave";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { TranscriptionResult, fetchUtterances, UtteranceTimestamp } from "@/services/audio/transcriptionService";
import { formatSpeakerText, parseSpeakerTextToUtterances } from "@/components/radio/utils/speakerTextUtils";

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

  useEffect(() => {
    if (
      hasSpeakerLabels &&
      enhancedTranscriptionResult?.utterances &&
      enhancedTranscriptionResult.utterances.length > 0
    ) {
      console.log('[useTranscriptionEditor] Formatting speaker text from utterances:', 
        enhancedTranscriptionResult.utterances.length);
      const formatted = formatSpeakerText(enhancedTranscriptionResult.utterances);
      if (localSpeakerText !== formatted) {
        console.log('[useTranscriptionEditor] Updating local speaker text');
        setLocalSpeakerText(formatted);
      }
    } else if (transcriptionText && !hasSpeakerLabels) {
      if (localSpeakerText !== transcriptionText) {
        console.log('[useTranscriptionEditor] Using plain transcription text (no speaker labels)');
        setLocalSpeakerText(transcriptionText);
      }
    } else if (!transcriptionText && !hasSpeakerLabels) {
      if (localSpeakerText !== "") setLocalSpeakerText("");
    }
  }, [enhancedTranscriptionResult?.utterances, transcriptionText, hasSpeakerLabels, setLocalSpeakerText]);

  useEffect(() => {
    if (transcriptionResult?.utterances && transcriptionResult.utterances.length > 0) {
      console.log('[useTranscriptionEditor] New transcription result with utterances received');
      setEnhancedTranscriptionResult(transcriptionResult);
    } else {
      setEnhancedTranscriptionResult(transcriptionResult);
    }
  }, [transcriptionResult]);

  useEffect(() => {
    const fetchSpeakerData = async () => {
      if (
        transcriptionId &&
        enhancedTranscriptionResult &&
        (!enhancedTranscriptionResult.utterances || enhancedTranscriptionResult.utterances.length === 0)
      ) {
        try {
          setIsLoadingUtterances(true);
          console.log('[useTranscriptionEditor] Fetching utterances for ID:', transcriptionId);
          const utterances = await fetchUtterances(transcriptionId);
          
          if (utterances && utterances.length > 0) {
            console.log('[useTranscriptionEditor] Received utterances:', utterances.length);
            setEnhancedTranscriptionResult(prev => ({
              ...(prev || transcriptionResult),
              utterances
            }));
            
            const formattedText = formatSpeakerText(utterances);
            console.log('[useTranscriptionEditor] Setting formatted speaker text');
            setLocalSpeakerText(formattedText);
            
            onTranscriptionChange(formattedText);
          } else {
            console.log('[useTranscriptionEditor] No utterances returned from fetch');
          }
        } catch (error) {
          console.error('[useTranscriptionEditor] Error fetching utterances:', error);
          setSaveError("No se pudieron cargar los datos de hablantes");
          toast({
            title: "No se pudieron cargar los datos de hablantes",
            description: "Intente nuevamente más tarde.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingUtterances(false);
        }
      }
    };
    fetchSpeakerData();
  }, [transcriptionId, enhancedTranscriptionResult, onTranscriptionChange, setLocalSpeakerText, toast]);

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
    enabled: !!transcriptionId,
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
    if (hasSpeakerLabels) {
      const newUtterances: UtteranceTimestamp[] = parseSpeakerTextToUtterances(newText);
      setEnhancedTranscriptionResult(prev =>
        prev
          ? { ...prev, utterances: newUtterances }
          : { utterances: newUtterances, text: newText }
      );
      setLocalSpeakerText(newText);
      onTranscriptionChange(newText);
    } else {
      setLocalSpeakerText(newText);
      onTranscriptionChange(newText);
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
    resetLocalSpeakerText
  };
};
