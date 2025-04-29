
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
  
  // Create a more robust key for persistence
  const storageKey = `transcription-draft-${transcriptionText?.substring(0, 20) || 'empty'}-${Date.now().toString().substring(0, 6)}`;
  
  // Use persistent state with session storage for unsaved content
  const [localText, setLocalText] = usePersistentState(
    storageKey,
    transcriptionText || "",
    { storage: 'sessionStorage' }
  );

  // Ensure we update local text when transcription changes from parent
  // with a check to prevent losing edits
  useEffect(() => {
    if (transcriptionText && (!localText || transcriptionText !== localText)) {
      setLocalText(transcriptionText);
    }
  }, [transcriptionText]);

  // Setup autosave
  const { isSaving, saveSuccess } = useAutosave({
    data: localText,
    onSave: async (text) => {
      try {
        if (!text) return;
        
        const { error } = await supabase
          .from('transcriptions')
          .update({ transcription_text: text })
          .eq('transcription_text', transcriptionText);

        if (error) throw error;
        
        return;
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

  // Show toast only when saveSuccess changes to true
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
    setLocalText(newText);
    onTranscriptionChange(newText);
  };

  // Make sure we're rendering something sensible
  const displayText = localText || transcriptionText || "";

  return (
    <div className="relative">
      <Textarea
        placeholder="Aquí aparecerá el texto transcrito..."
        className="min-h-[200px] resize-y"
        value={displayText}
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
