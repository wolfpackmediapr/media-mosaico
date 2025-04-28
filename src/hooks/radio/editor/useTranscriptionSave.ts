
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutosave } from "@/hooks/use-autosave";
import { toast } from "sonner";

interface UseTranscriptionSaveProps {
  transcriptionId?: string;
  localText: string;
}

export const useTranscriptionSave = ({
  transcriptionId,
  localText
}: UseTranscriptionSaveProps) => {
  const [saveError, setSaveError] = useState<string | null>(null);

  // Use the autosave hook with showSuccessToast set to false to prevent loops
  const { isSaving, saveSuccess } = useAutosave({
    data: { text: localText, id: transcriptionId },
    onSave: async (data) => {
      if (!data.id) return;
      try {
        setSaveError(null);
        const { error } = await supabase
          .from('radio_transcriptions')
          .update({
            transcription_text: data.text,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id);
        
        if (error) {
          console.error('[useTranscriptionSave] Error saving:', error);
          setSaveError(error.message);
          throw error;
        }
      } catch (error) {
        console.error('[useTranscriptionSave] Error in save operation:', error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        setSaveError(errorMessage);
        toast.error("No se pudo guardar la transcripción");
        throw error;
      }
    },
    debounce: 2000,
    enabled: !!transcriptionId && !!localText,
    showSuccessToast: false
  });

  return { isSaving, saveError, saveSuccess };
};
