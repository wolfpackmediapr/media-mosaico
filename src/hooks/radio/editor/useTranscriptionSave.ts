
import { useState, useRef } from "react";
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
  const lastSavedContentRef = useRef<string>(localText);

  // Use the autosave hook with increased debounce and content comparison
  const { isSaving, saveSuccess } = useAutosave({
    data: { text: localText, id: transcriptionId },
    onSave: async (data) => {
      if (!data.id) return;
      
      // Skip save if content hasn't changed
      if (data.text === lastSavedContentRef.current) {
        return;
      }

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
          toast.error("No se pudo guardar la transcripción");
          throw error;
        }

        // Update last saved content only after successful save
        lastSavedContentRef.current = data.text;
        toast.success("Transcripción guardada correctamente");
      } catch (error) {
        console.error('[useTranscriptionSave] Error in save operation:', error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        setSaveError(errorMessage);
        throw error;
      }
    },
    debounce: 3000, // Increased debounce to 3 seconds
    enabled: !!transcriptionId && !!localText,
    showSuccessToast: false // We'll handle toasts manually
  });

  return { isSaving, saveError, saveSuccess };
};
