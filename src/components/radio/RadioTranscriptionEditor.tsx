
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/use-autosave";
import { usePersistentState } from "@/hooks/use-persistent-state";
import RadioTimestampedTranscription from "./RadioTimestampedTranscription";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import TranscriptionModeToggle from "./editor/TranscriptionModeToggle";
import CopyTextButton from "./editor/CopyTextButton";
import StatusIndicator from "./editor/StatusIndicator";
import TranscriptionTextArea from "./editor/TranscriptionTextArea";
import TranscriptionFeedback from "./editor/TranscriptionFeedback";

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
  const [isEditing, setIsEditing] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);
  
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

  const toggleTimestampView = () => {
    setShowTimestamps(!showTimestamps);
    
    // Exit edit mode when showing timestamps
    if (!showTimestamps && isEditing) {
      setIsEditing(false);
    }
  };

  const hasTimestampData = Boolean(
    transcriptionResult?.sentences?.length || 
    transcriptionResult?.words?.length
  );

  return (
    <div className="relative">
      {showTimestamps && hasTimestampData ? (
        <RadioTimestampedTranscription 
          transcriptionResult={transcriptionResult}
          text={localText}
          onTimestampClick={onTimestampClick}
        />
      ) : (
        <TranscriptionTextArea
          text={localText}
          isProcessing={isProcessing}
          isEditing={isEditing}
          onChange={handleTextChange}
          onClick={() => !isEditing && toggleEditMode()}
        />
      )}
      <div className="absolute top-2 right-2 flex flex-col gap-2">
        <TranscriptionModeToggle
          showTimestamps={showTimestamps}
          isEditing={isEditing}
          hasTimestampData={hasTimestampData}
          isProcessing={isProcessing}
          toggleTimestampView={toggleTimestampView}
          toggleEditMode={toggleEditMode}
        />
        <CopyTextButton text={localText} isProcessing={isProcessing} />
        <StatusIndicator isSaving={isSaving} />
      </div>
      <TranscriptionFeedback
        isEmpty={!localText}
        isProcessing={isProcessing}
        showTimestamps={showTimestamps}
        hasTimestampData={hasTimestampData}
      />
    </div>
  );
};

export default RadioTranscriptionEditor;
