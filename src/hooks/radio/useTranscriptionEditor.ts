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
      const formatted = formatSpeakerText(enhancedTranscriptionResult.utterances);
      if (localSpeakerText !== formatted) setLocalSpeakerText(formatted);
    } else if (transcriptionText && !hasSpeakerLabels) {
      if (localSpeakerText !== transcriptionText) setLocalSpeakerText(transcriptionText);
    } else if (!transcriptionText && !hasSpeakerLabels) {
      if (localSpeakerText !== "") setLocalSpeakerText("");
    }
    // eslint-disable-next-line
  }, [enhancedTranscriptionResult?.utterances, transcriptionText]);

  useEffect(() => {
    setEnhancedTranscriptionResult(transcriptionResult);
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
          const utterances = await fetchUtterances(transcriptionId);
          if (utterances && utterances.length > 0) {
            setEnhancedTranscriptionResult(prev => ({
              ...(prev || transcriptionResult),
              utterances
            }));
            setLocalSpeakerText(formatSpeakerText(utterances));
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
    if (hasSpeakerLabels) {
      const newUtterances: UtteranceTimestamp[] = parseSpeakerTextToUtterances(newText);
      setEnhancedTranscriptionResult(prev =>
        prev
          ? { ...prev, utterances: newUtterances }
          : { utterances: newUtterances, text: newText }
      );
      const formatted = formatSpeakerText(newUtterances);
      setLocalSpeakerText(formatted);
      onTranscriptionChange(formatted);
    } else {
      setLocalSpeakerText(newText);
      onTranscriptionChange(newText);
    }
    if (!isEditing) setIsEditing(true);
  };

  const resetLocalSpeakerText = () => {
    removeLocalSpeakerText();
    setLocalSpeakerText("");
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
    resetLocalSpeakerText
  };
};
