
import { useState, useRef, useEffect, useCallback } from "react";
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
  const pendingSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any pending saves on unmount
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current);
        pendingSaveRef.current = null;
      }
    };
  }, []);

  // Function to save content to Supabase
  const saveContent = useCallback(async (data: { text: string, id?: string }): Promise<void> => {
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
  }, []);

  // Use the autosave hook with content comparison and debounce
  const { isSaving, saveSuccess } = useAutosave({
    data: { text: localText, id: transcriptionId },
    onSave: saveContent,
    debounce: 3000, // 3 seconds debounce
    enabled: !!transcriptionId && !!localText,
    showSuccessToast: false // We'll handle toasts manually
  });

  // Forced save function for immediate saving
  const forceSave = useCallback(async () => {
    if (!transcriptionId) return false;
    
    try {
      await saveContent({
        text: localText,
        id: transcriptionId
      });
      return true;
    } catch (error) {
      console.error('[useTranscriptionSave] Force save error:', error);
      return false;
    }
  }, [localText, saveContent, transcriptionId]);

  return { 
    isSaving, 
    saveError, 
    saveSuccess,
    forceSave 
  };
};
