import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

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
  const [localText, setLocalText] = useState(transcriptionText);

  useEffect(() => {
    setLocalText(transcriptionText);
  }, [transcriptionText]);

  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    onTranscriptionChange(newText);
    
    setIsSaving(true);
    try {
      const { data: transcriptions } = await supabase
        .from('transcriptions')
        .select('id')
        .eq('transcription_text', transcriptionText)
        .single();

      if (transcriptions) {
        const { error } = await supabase
          .from('transcriptions')
          .update({ transcription_text: newText })
          .eq('id', transcriptions.id);

        if (error) throw error;

        setTimeout(() => setIsSaving(false), 1000);
        
        toast({
          title: "Guardado automático",
          description: "La transcripción se ha guardado correctamente",
        });
      }
    } catch (error) {
      console.error('Error saving transcription:', error);
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

export default TranscriptionEditor;