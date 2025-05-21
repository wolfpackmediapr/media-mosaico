
import { useCallback, useEffect } from 'react';
import { useEditorModes } from './useEditorModes';
import { useEditorState } from './useEditorState';
import { TranscriptionResult } from '@/services/audio/transcriptionService';

interface UseEnhancedEditorStateProps {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onTranscriptionChange: (text: string) => void;
}

export const useEnhancedEditorState = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  onTranscriptionChange
}: UseEnhancedEditorStateProps) => {
  // Determine if we have timestamp data
  const hasTimestampData = !!transcriptionResult?.utterances && 
                         transcriptionResult.utterances.length > 0;
  
  // Use editor modes hook for managing view/edit modes
  const { 
    viewMode,
    isEditing,
    showTimestamps,
    toggleTimestampView,
    toggleEditMode,
    resetModes 
  } = useEditorModes({ 
    transcriptionId, 
    hasTimestampData 
  });
  
  // Use editor state hook for managing text content
  const { 
    localText,
    updateLocalText,
    handleTextChange 
  } = useEditorState({
    initialText: transcriptionText,
    onTextChange: onTranscriptionChange
  });
  
  // Reset view mode to edit when transcription text is cleared
  useEffect(() => {
    if (!transcriptionText && viewMode !== 'edit') {
      console.log('[useEnhancedEditorState] Empty transcription text, resetting view mode to edit');
      resetModes();
    }
  }, [transcriptionText, viewMode, resetModes]);
  
  // We need to update local text when transcription text changes from outside
  useEffect(() => {
    if (transcriptionText !== localText) {
      updateLocalText(transcriptionText);
    }
  }, [transcriptionText, localText, updateLocalText]);
  
  // Reset function for parent components
  const resetEditor = useCallback(() => {
    console.log('[useEnhancedEditorState] Resetting editor state');
    resetModes();
    updateLocalText('');
  }, [resetModes, updateLocalText]);
  
  return {
    localText,
    isEditing,
    viewMode,
    showTimestamps,
    hasTimestampData,
    handleTextChange,
    toggleTimestampView,
    toggleEditMode,
    resetEditor
  };
};
