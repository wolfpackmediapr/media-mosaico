
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAutosave } from "@/hooks/use-autosave";
import { usePersistentState } from "@/hooks/use-persistent-state";

interface TranscriptionEditorProps {
  transcriptionText: string;
  isProcessing: boolean;
  onTranscriptionChange: (text: string) => void;
}

const TranscriptionEditor = ({
  transcriptionText,
  isProcessing,
  onTranscriptionChange,
}: TranscriptionEditorProps) => {
  const { toast } = useToast();
  
  // Use persistent state with session storage for unsaved content
  const [localText, setLocalText] = usePersistentState(
    `transcription-draft-${transcriptionText.substring(0, 20)}`,
    transcriptionText,
    { storage: 'sessionStorage' }
  );

  // Update local text when transcription changes from parent
  useEffect(() => {
    setLocalText(transcriptionText);
  }, [transcriptionText, setLocalText]);

  // Setup autosave
  const { isSaving } = useAutosave({
    data: localText,
    onSave: async (text) => {
      try {
        const { error } = await supabase
          .from('transcriptions')
          .update({ transcription_text: text })
          .eq('transcription_text', transcriptionText);

        if (error) throw error;
        
        toast({
          title: "Guardado automático",
          description: "La transcripción se ha guardado correctamente",
        });
      } catch (error) {
        toast({
          title: "Error al guardar",
          description: "No se pudo guardar la transcripción",
          variant: "destructive",
        });
        throw error;
      }
    },
    debounce: 2000, // Save after 2 seconds of inactivity
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

export default TranscriptionEditor;
