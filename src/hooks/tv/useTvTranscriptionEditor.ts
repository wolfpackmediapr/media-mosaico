import { useState, useRef, useEffect, useCallback } from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useTvSpeakerTextState } from "./useTvSpeakerTextState";
import { supabase } from "@/integrations/supabase/client";
import { useAutosave } from "@/hooks/use-autosave";
import { toast } from "sonner";
import { hasSpeakerData } from "../radio/utils/transcriptionUtils";

interface UseTvTranscriptionEditorProps {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onTranscriptionChange: (text: string) => void;
}

export const useTvTranscriptionEditor = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  onTranscriptionChange,
}: UseTvTranscriptionEditorProps) => {
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastSavedContentRef = useRef<string>(transcriptionText);

  // Handle speaker text state (TV-specific - no utterance fetching)
  const {
    localText,
    isEditing,
    handleTextChange,
    toggleEditMode,
    hasSpeakerLabels,
    resetLocalSpeakerText,
    enhancedTranscriptionResult,
    setEnhancedTranscriptionResult
  } = useTvSpeakerTextState({
    transcriptionText,
    transcriptionId,
    transcriptionResult,
    onTranscriptionChange
  });

  // TV-specific save function for transcriptions table
  const saveContent = useCallback(async (data: { text: string, id?: string }): Promise<void> => {
    if (!data.id) return;
    
    // Skip save if content hasn't changed
    if (data.text === lastSavedContentRef.current) {
      return;
    }

    try {
      setSaveError(null);
      const { error } = await supabase
        .from('transcriptions')
        .update({
          transcription_text: data.text,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);
      
      if (error) {
        console.error('[useTvTranscriptionEditor] Error saving:', error);
        setSaveError(error.message);
        toast.error("No se pudo guardar la transcripción");
        throw error;
      }

      lastSavedContentRef.current = data.text;
      toast.success("Transcripción guardada correctamente");
    } catch (error) {
      console.error('[useTvTranscriptionEditor] Error in save operation:', error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setSaveError(errorMessage);
      throw error;
    }
  }, []);

  // Use autosave hook for TV transcriptions
  const { isSaving, saveSuccess } = useAutosave({
    data: { text: localText, id: transcriptionId },
    onSave: saveContent,
    debounce: 3000,
    enabled: !!transcriptionId && !!localText,
    showSuccessToast: false
  });

  // Force save method for manual triggers
  const handleForceSave = useCallback(async () => {
    if (!transcriptionId) return false;
    
    try {
      await saveContent({
        text: localText,
        id: transcriptionId
      });
      return true;
    } catch (error) {
      console.error('[useTvTranscriptionEditor] Force save error:', error);
      return false;
    }
  }, [localText, saveContent, transcriptionId]);

  // Check if there are actual utterances in the result
  const hasUtterances = useCallback(() => {
    return hasSpeakerData(enhancedTranscriptionResult);
  }, [enhancedTranscriptionResult]);

  // TV-specific computed properties (no loading state since we don't fetch utterances)
  const showTimestamps = hasSpeakerLabels;
  const hasTimestampData = hasSpeakerLabels;
  const isLoadingUtterances = false; // TV doesn't fetch utterances separately

  return {
    localText,
    isEditing,
    isLoadingUtterances,
    showTimestamps,
    hasTimestampData,
    isSaving,
    saveError,
    saveSuccess,
    handleTextChange,
    toggleEditMode,
    hasSpeakerLabels,
    resetLocalSpeakerText,
    enhancedTranscriptionResult,
    hasUtterances,
    handleForceSave
  };
};