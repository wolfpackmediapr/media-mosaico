
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAutosave } from "@/hooks/use-autosave";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { Copy, CheckCheck, Edit, Check, FileText, Clock } from "lucide-react";
import RadioTimestampedTranscription from "./RadioTimestampedTranscription";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RadioTranscriptionEditorProps {
  transcriptionText: string;
  isProcessing: boolean;
  onTranscriptionChange: (text: string) => void;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onTimestampClick?: (timestamp: number) => void;
}

const RadioTranscriptionEditor = ({
  transcriptionText,
  isProcessing,
  onTranscriptionChange,
  transcriptionId,
  transcriptionResult,
  onTimestampClick
}: RadioTranscriptionEditorProps) => {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("text");
  
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

  const hasTimestampData = Boolean(
    transcriptionResult?.sentences?.length || 
    transcriptionResult?.words?.length
  );

  return (
    <div className="relative">
      <div className="mb-2 flex justify-between items-center">
        {hasTimestampData ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="text" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>Texto</span>
              </TabsTrigger>
              <TabsTrigger value="timestamps" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Timestamps</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-1 absolute right-0">
              {activeTab === "text" && (
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
              )}
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
                <span className="text-xs text-primary animate-pulse whitespace-nowrap ml-2">
                  Guardando...
                </span>
              )}
            </div>
            
            <TabsContent value="text" className="mt-0">
              <Textarea
                placeholder="Aquí aparecerá el texto transcrito..."
                className={`min-h-[200px] resize-y ${isEditing ? 'border-primary' : ''} focus:border-primary focus-visible:ring-1`}
                value={localText}
                onChange={handleTextChange}
                readOnly={isProcessing || !isEditing}
                onClick={() => !isEditing && toggleEditMode()}
              />
            </TabsContent>
            
            <TabsContent value="timestamps" className="mt-0">
              {hasTimestampData ? (
                <RadioTimestampedTranscription 
                  transcriptionResult={transcriptionResult}
                  text={localText}
                  onTimestampClick={onTimestampClick}
                />
              ) : (
                <div className="p-4 border rounded-md bg-muted/20 min-h-[200px] flex items-center justify-center">
                  <p className="text-muted-foreground">No hay datos de timestamps disponibles para esta transcripción.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex justify-between items-center w-full">
            <div></div>
            <div className="flex items-center gap-1">
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
                <span className="text-xs text-primary animate-pulse whitespace-nowrap ml-2">
                  Guardando...
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {!hasTimestampData && (
        <Textarea
          placeholder="Aquí aparecerá el texto transcrito..."
          className={`min-h-[200px] resize-y ${isEditing ? 'border-primary' : ''} focus:border-primary focus-visible:ring-1`}
          value={localText}
          onChange={handleTextChange}
          readOnly={isProcessing || !isEditing}
          onClick={() => !isEditing && toggleEditMode()}
        />
      )}

      {!localText && !isProcessing && (!hasTimestampData || activeTab === "text") && (
        <p className="text-sm text-muted-foreground mt-2">
          Procese un archivo de audio para ver la transcripción aquí. Podrá editar el texto una vez transcrito.
        </p>
      )}
    </div>
  );
};

export default RadioTranscriptionEditor;
