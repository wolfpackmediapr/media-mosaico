
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

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
  const [isSaving, setIsSaving] = useState(false);
  const [localText, setLocalText] = useState(transcriptionText);

  useEffect(() => {
    setLocalText(transcriptionText);
  }, [transcriptionText]);

  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    onTranscriptionChange(newText);
    
    if (!transcriptionId) {
      console.warn('No transcription ID provided for saving');
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('transcriptions')
        .update({ transcription_text: newText })
        .eq('id', transcriptionId);

      if (error) throw error;

      setTimeout(() => setIsSaving(false), 1000);
      
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
      setIsSaving(false);
    }
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
