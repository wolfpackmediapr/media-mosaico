
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAutosave } from "@/hooks/use-autosave";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { Copy, CheckCheck } from "lucide-react";

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
  const [isCopied, setIsCopied] = useState(false);
  
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
  const { isSaving, saveSuccess } = useAutosave({
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
        
        // No mostramos el toast aquí directamente
        return;
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

  // Mostrar toast solo cuando saveSuccess cambie a true
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

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(localText);
      setIsCopied(true);
      toast({
        title: "Texto copiado",
        description: "El texto ha sido copiado al portapapeles",
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar el texto. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative">
      <Textarea
        placeholder="Aquí aparecerá el texto transcrito..."
        className="min-h-[200px] resize-y pr-12"
        value={localText}
        onChange={handleTextChange}
        disabled={isProcessing}
      />
      <div className="absolute top-2 right-2 flex flex-col gap-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleCopyText}
          disabled={!localText || isProcessing}
          className="hover:bg-primary/10"
          aria-label="Copiar texto"
          title="Copiar texto"
        >
          {isCopied ? (
            <CheckCheck className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        {isSaving && (
          <span className="text-xs text-primary animate-pulse whitespace-nowrap">
            Guardando...
          </span>
        )}
      </div>
    </div>
  );
};

export default RadioTranscriptionEditor;
