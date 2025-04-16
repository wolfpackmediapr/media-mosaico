import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/use-autosave";
import { usePersistentState } from "@/hooks/use-persistent-state";
import RadioTimestampedTranscription from "./RadioTimestampedTranscription";
import { TranscriptionResult, fetchUtterances } from "@/services/audio/transcriptionService";
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
  const [enhancedTranscriptionResult, setEnhancedTranscriptionResult] = 
    useState<TranscriptionResult | undefined>(transcriptionResult);
  
  const [localText, setLocalText] = usePersistentState(
    `radio-transcription-${transcriptionId || "draft"}`,
    transcriptionText,
    { storage: 'sessionStorage' }
  );

  useEffect(() => {
    setLocalText(transcriptionText);
  }, [transcriptionText, setLocalText]);

  useEffect(() => {
    setEnhancedTranscriptionResult(transcriptionResult);
  }, [transcriptionResult]);

  useEffect(() => {
    const fetchSpeakerData = async () => {
      if (
        transcriptionId && 
        showTimestamps && 
        transcriptionResult && 
        (!transcriptionResult.utterances || transcriptionResult.utterances.length === 0)
      ) {
        try {
          console.log('Fetching utterances for transcript ID:', transcriptionId);
          const utterances = await fetchUtterances(transcriptionId);
          
          if (utterances && utterances.length > 0) {
            console.log(`Retrieved ${utterances.length} utterances for transcript`);
            setEnhancedTranscriptionResult(prev => ({
              ...(prev || transcriptionResult),
              utterances
            }));
          } else {
            console.warn('No utterances found for transcript ID:', transcriptionId);
          }
        } catch (error) {
          console.error('Error fetching utterances:', error);
          toast({
            title: "No se pudieron cargar los datos de hablantes",
            description: "Intente nuevamente o use otro modo de visualización",
            variant: "destructive",
          });
        }
      }
    };

    fetchSpeakerData();
  }, [transcriptionId, showTimestamps, transcriptionResult, toast]);

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
    debounce: 2000,
    enabled: !!transcriptionId,
  });

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
    
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setTimeout(() => {
        const textarea = document.querySelector('textarea');
        if (textarea) textarea.focus();
      }, 0);
    }
  };

  const toggleTimestampView = () => {
    setShowTimestamps(!showTimestamps);
    
    if (!showTimestamps && isEditing) {
      setIsEditing(false);
    }
  };

  const hasTimestampData = Boolean(
    enhancedTranscriptionResult?.sentences?.length || 
    enhancedTranscriptionResult?.words?.length ||
    enhancedTranscriptionResult?.utterances?.length
  );

  return (
    <div className="relative">
      {showTimestamps && hasTimestampData ? (
        <RadioTimestampedTranscription 
          transcriptionResult={enhancedTranscriptionResult}
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
