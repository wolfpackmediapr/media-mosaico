
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/use-autosave";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { TranscriptionResult, fetchUtterances } from "@/services/audio/transcriptionService";

interface UseTranscriptionEditorProps {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onTranscriptionChange: (text: string) => void;
}

export const useTranscriptionEditor = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  onTranscriptionChange,
}: UseTranscriptionEditorProps) => {
  const { toast } = useToast();
  
  // Use persistent state for editor mode
  const [isEditing, setIsEditing] = usePersistentState(
    `transcription-editor-mode-${transcriptionId || "draft"}`,
    false,
    { storage: 'sessionStorage' }
  );
  
  // Determine initial showTimestamps state based on available data
  const hasTimestampData = Boolean(
    transcriptionResult?.sentences?.length || 
    transcriptionResult?.words?.length ||
    transcriptionResult?.utterances?.length
  );
  
  // Use persistent state for timestamp view preference
  const [showTimestamps, setShowTimestamps] = usePersistentState(
    `transcription-timestamp-view-${transcriptionId || "draft"}`,
    hasTimestampData,
    { storage: 'sessionStorage' }
  );
  
  const [enhancedTranscriptionResult, setEnhancedTranscriptionResult] = 
    useState<TranscriptionResult | undefined>(transcriptionResult);
  const [isLoadingUtterances, setIsLoadingUtterances] = useState(false);
  
  // Use persistent state for the text content
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
    // Update showTimestamps state when transcriptionResult changes
    if (hasTimestampData && !isEditing) {
      setShowTimestamps(true);
    }
  }, [transcriptionResult, hasTimestampData, isEditing]);

  useEffect(() => {
    const fetchSpeakerData = async () => {
      if (
        transcriptionId && 
        showTimestamps && 
        transcriptionResult && 
        (!transcriptionResult.utterances || transcriptionResult.utterances.length === 0)
      ) {
        try {
          setIsLoadingUtterances(true);
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
        } finally {
          setIsLoadingUtterances(false);
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

  return {
    localText,
    isEditing,
    showTimestamps,
    hasTimestampData,
    enhancedTranscriptionResult,
    isLoadingUtterances,
    isSaving,
    handleTextChange,
    toggleEditMode,
    toggleTimestampView,
  };
};
