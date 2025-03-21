
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAutosave } from "@/hooks/use-autosave";
import { usePersistentState } from "@/hooks/use-persistent-state";

interface RadioTranscriptionEditorProps {
  transcriptionText: string;
  isProcessing: boolean;
  onTranscriptionChange: (text: string) => void;
  transcriptionId?: string;
}

const RadioTranscriptionEditor = ({
  transcriptionText,
  isProcessing,
  onTranscriptionChange,
  transcriptionId,
}: RadioTranscriptionEditorProps) => {
  const { toast } = useToast();
  
  // Use persistent state with session storage for unsaved content
  const [localText, setLocalText] = usePersistentState(
    `radio-transcription-${transcriptionId || "draft"}`,
    transcriptionText,
    { storage: 'sessionStorage' }
  );

  // Update local text when transcription changes from parent
  useEffect(() => {
    setLocalText(transcriptionText);
  }, [transcriptionText, setLocalText]);

  // Setup autosave
  const { isSaving } = useAutosave({
    data: { text: localText, id: transcriptionId },
    onSave: async (data) => {
      if (!data.id) {
        console.warn('No transcription ID provided for saving');
        return;
      }
      
      try {
        const { error } = await supabase
          .from('transcriptions')
          .update({ 
            transcription_text: data.text,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id);

        if (error) throw error;

        toast({
          title: "Guardado automático",
          description: "La transcripción se ha guardado correctamente",
        });
      } catch (error) {
        console.error('Error saving transcription:', error);
        toast({
          title: "Error al guardar",
          description: "No se pudo guardar la transcripción",
          variant: "destructive",
        });
        throw error;
      }
    },
    debounce: 2000, // Save after 2 seconds of inactivity
    enabled: !!transcriptionId,
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    onTranscriptionChange(newText);
  };

  return (
    <div className="relative">
      <Textarea
        placeholder="Aquí aparecerá el texto transcrito..."
        className="min-h-[200px] resize-y"
        value={localText}
        onChange={handleTextChange}
        disabled={isProcessing}
      />
      {isSaving && (
        <div className="absolute top-2 right-2">
          <span className="text-sm text-primary animate-pulse">
            Guardando...
          </span>
        </div>
      )}
    </div>
  );
};

export default RadioTranscriptionEditor;
