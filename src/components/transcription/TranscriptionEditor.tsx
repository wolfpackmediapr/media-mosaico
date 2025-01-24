import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

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
  const [isSaving, setIsSaving] = useState(false);

  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    onTranscriptionChange(newText);
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('transcriptions')
        .update({ transcription_text: newText })
        .eq('transcription_text', transcriptionText);

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
    <Textarea
      placeholder="Aquí aparecerá el texto transcrito..."
      className="min-h-[200px] resize-y"
      value={transcriptionText}
      onChange={handleTextChange}
      disabled={isProcessing}
    />
  );
};

export default TranscriptionEditor;