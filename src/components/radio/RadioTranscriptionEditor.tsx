
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAutosave } from "@/hooks/use-autosave";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { Copy, CheckCheck, Edit, Check } from "lucide-react";

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
  const [isEditing, setIsEditing] = useState(false);
  
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
    
    // Automatically enter edit mode when the user starts typing
    if (!isEditing) {
      setIsEditing(true);
    }
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

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    // Focus the textarea when entering edit mode
    if (!isEditing) {
      setTimeout(() => {
        const textarea = document.querySelector('textarea');
        if (textarea) textarea.focus();
      }, 0);
    }
  };

  return (
    <div className="relative">
      <Textarea
        placeholder="Aquí aparecerá el texto transcrito..."
        className={`min-h-[200px] resize-y pr-12 ${isEditing ? 'border-primary' : ''} focus:border-primary focus-visible:ring-1`}
        value={localText}
        onChange={handleTextChange}
        readOnly={isProcessing || !isEditing}
        onClick={() => !isEditing && toggleEditMode()}
      />
      <div className="absolute top-2 right-2 flex flex-col gap-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={toggleEditMode}
          disabled={isProcessing}
          className="hover:bg-primary/10 transition-colors"
          aria-label={isEditing ? "Finalizar edición" : "Editar texto"}
          title={isEditing ? "Finalizar edición" : "Editar texto"}
        >
          {isEditing ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Edit className={`h-4 w-4 ${isEditing ? 'text-primary' : ''}`} />
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleCopyText}
          disabled={!localText || isProcessing}
          className="hover:bg-primary/10 transition-colors"
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
      {!localText && !isProcessing && (
        <p className="text-sm text-muted-foreground mt-2">
          Procese un archivo de audio para ver la transcripción aquí. Podrá editar el texto una vez transcrito.
        </p>
      )}
    </div>
  );
};

export default RadioTranscriptionEditor;
