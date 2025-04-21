
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/use-autosave";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { TranscriptionResult, fetchUtterances } from "@/services/audio/transcriptionService";
import { formatSpeakerText, parseSpeakerTextToUtterances } from "@/components/radio/utils/speakerTextUtils";

interface UseTranscriptionEditorProps {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onTranscriptionChange: (text: string) => void;
}

// This hook now always promotes utterance-labeled editing if utterances exist
export const useTranscriptionEditor = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  onTranscriptionChange,
}: UseTranscriptionEditorProps) => {
  const { toast } = useToast();

  const [isEditing, setIsEditing] = usePersistentState(
    `transcription-editor-mode-${transcriptionId || "draft"}`,
    false,
    { storage: 'sessionStorage' }
  );

  // Speaker text handling (single source-of-truth for editor if utterances available)
  const [enhancedTranscriptionResult, setEnhancedTranscriptionResult] =
    useState<TranscriptionResult | undefined>(transcriptionResult);
  const [isLoadingUtterances, setIsLoadingUtterances] = useState(false);

  // If utterances exist, show them as editable text, else fall back to plain
  const hasSpeakerLabels = Boolean(
    enhancedTranscriptionResult?.utterances &&
    enhancedTranscriptionResult.utterances.length > 0
  );
  const [localSpeakerText, setLocalSpeakerText] = usePersistentState(
    `radio-transcription-speaker-${transcriptionId || "draft"}`,
    hasSpeakerLabels && enhancedTranscriptionResult?.utterances
      ? formatSpeakerText(enhancedTranscriptionResult.utterances)
      : transcriptionText,
    { storage: 'sessionStorage' }
  );

  useEffect(() => {
    // When new utterances arrive, update the text shown in editor
    if (
      hasSpeakerLabels &&
      enhancedTranscriptionResult?.utterances &&
      enhancedTranscriptionResult.utterances.length > 0
    ) {
      setLocalSpeakerText(formatSpeakerText(enhancedTranscriptionResult.utterances));
    } else if (transcriptionText && !hasSpeakerLabels) {
      setLocalSpeakerText(transcriptionText);
    }
    // Only fire when utterances/transcriptionText updates
    // eslint-disable-next-line
  }, [enhancedTranscriptionResult?.utterances, transcriptionText]);

  useEffect(() => {
    setEnhancedTranscriptionResult(transcriptionResult);
  }, [transcriptionResult]);

  useEffect(() => {
    // Always fetch utterances if not present, if a transcriptId is available
    const fetchSpeakerData = async () => {
      if (
        transcriptionId &&
        enhancedTranscriptionResult &&
        (!enhancedTranscriptionResult.utterances || enhancedTranscriptionResult.utterances.length === 0)
      ) {
        try {
          setIsLoadingUtterances(true);
          const utterances = await fetchUtterances(transcriptionId);
          if (utterances && utterances.length > 0) {
            setEnhancedTranscriptionResult(prev => ({
              ...(prev || transcriptionResult),
              utterances
            }));
          }
        } catch (error) {
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
    // eslint-disable-next-line
  }, [transcriptionId, enhancedTranscriptionResult]);

  // Autosave: always save current editable text to the database
  const { isSaving, saveSuccess } = useAutosave({
    data: { text: localSpeakerText, id: transcriptionId },
    onSave: async (data) => {
      if (!data.id) return;
      try {
        const { error } = await supabase
          .from('transcriptions')
          .update({
            transcription_text: data.text,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id);
        if (error) throw error;
      } catch (error) {
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
      toast({
        title: "Guardado automático",
        description: "La transcripción se ha guardado correctamente",
      });
    }
  }, [saveSuccess, toast]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalSpeakerText(newText);
    onTranscriptionChange(newText);

    if (!isEditing) setIsEditing(true);
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  return {
    localText: localSpeakerText,
    isEditing,
    isLoadingUtterances,
    isSaving,
    handleTextChange,
    toggleEditMode,
    hasSpeakerLabels,
  };
};
